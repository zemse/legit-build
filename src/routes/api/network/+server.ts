import { error, json } from '@sveltejs/kit';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attestations } from '$lib/server/db/schema';
import { buildCohorts, toView } from '$lib/server/attestations';
import { getGithubFollowingIds } from '$lib/server/github-oauth';
import { getFollowingIds } from '$lib/server/xdata';
import type { RequestHandler } from './$types';

// GET /api/network[?project=&tag=]
// Attestations made by accounts the signed-in viewer follows on X or GitHub (and the viewer).
// With project+tag, scoped to one release and marked against that release's
// dominant hash per target; otherwise the most recent ones across all projects.
export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const { twitter, github } = locals;
	if (!twitter && !github?.userId) throw error(401, 'not signed in');
	const kind = twitter ? 'twitter' : 'github';
	const viewer = twitter ? `@${twitter.handle}` : github!.login;
	const self = twitter ? twitter.userId : String(github!.userId);

	let following: { ids: string[]; truncated: boolean };
	try {
		following = twitter ? await getFollowingIds(twitter) : await getGithubFollowingIds(github!);
	} catch {
		throw error(502, 'Could not load who you follow right now, try again shortly');
	}
	const attesters = [...new Set([self, ...following.ids])].map((id) => `${kind}:${id}`);

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
		kind,
		viewer,
		followingChecked: following.ids.length,
		truncated: following.truncated,
		items
	});
};
