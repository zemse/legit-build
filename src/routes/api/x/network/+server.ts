import { error, json } from '@sveltejs/kit';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attestations } from '$lib/server/db/schema';
import { buildCohorts, toView } from '$lib/server/attestations';
import { getFollowingIds } from '$lib/server/xdata';
import type { RequestHandler } from './$types';

// GET /api/x/network[?project=&tag=]
// Attestations made by X accounts the signed-in viewer follows (and the viewer).
// With project+tag, scoped to one release and marked against that release's
// dominant hash per target; otherwise the most recent ones across all projects.
export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const viewer = locals.twitter;
	if (!viewer) throw error(401, 'not signed in with X');

	let following: { ids: string[]; truncated: boolean };
	try {
		following = await getFollowingIds(viewer);
	} catch {
		throw error(502, 'Could not load who you follow right now, try again shortly');
	}
	const attesters = [...new Set([viewer.userId, ...following.ids])].map((id) => `twitter:${id}`);

	const project = url.searchParams.get('project');
	const tag = url.searchParams.get('tag');
	const scope = [inArray(attestations.attester, attesters)];
	if (project && tag) scope.push(eq(attestations.project, project), eq(attestations.version, tag));

	const rows = await db
		.select()
		.from(attestations)
		.where(and(...scope))
		.orderBy(desc(attestations.createdAt))
		.limit(200);

	// Agreement is judged against every attestation of the release, not only the network's.
	let dominant = new Map<string, string>();
	if (project && tag) {
		const all = await db
			.select()
			.from(attestations)
			.where(and(eq(attestations.project, project), eq(attestations.version, tag)));
		dominant = new Map(
			buildCohorts(all.map(toView)).map((c) => [
				`${c.osArch}|${c.recipeHash}`,
				c.groups[0].artifactHash
			])
		);
	}

	const items = rows.map((r) => {
		const v = toView(r);
		const top = dominant.get(`${r.osArch}|${r.recipeHash}`);
		return { ...v, agrees: top === undefined ? null : top === r.artifactHash };
	});

	return json({
		viewer: viewer.handle,
		followingChecked: following.ids.length,
		truncated: following.truncated,
		items
	});
};
