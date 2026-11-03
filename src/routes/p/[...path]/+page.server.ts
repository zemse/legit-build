import { and, desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects, releases } from '$lib/server/db/schema';
import { buildCohorts, getReleaseAttestations } from '$lib/server/attestations';
import type { PageServerLoad } from './$types';

// Single rest route for a project and its releases. The project id is forge-
// qualified (`github/owner/repo`, possibly deeper); a release path appends
// `/releases/<tag>`. We split on that literal marker so slashes need no encoding.
export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=30' });

	const full = params.path;
	const marker = '/releases/';
	const idx = full.indexOf(marker);
	const projectId = idx >= 0 ? full.slice(0, idx) : full;
	const tag = idx >= 0 ? decodeURIComponent(full.slice(idx + marker.length)) : null;

	const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
	if (!project) throw error(404, 'Unknown project');

	if (tag === null) {
		const rels = await db
			.select()
			.from(releases)
			.where(eq(releases.projectId, projectId))
			.orderBy(desc(releases.publishedAt));
		return { view: 'project' as const, project, releases: rels };
	}

	const [release] = await db
		.select()
		.from(releases)
		.where(and(eq(releases.projectId, projectId), eq(releases.tag, tag)))
		.limit(1);

	const views = await getReleaseAttestations(projectId, tag);
	const cohorts = buildCohorts(views);
	const distinctIdentities = new Set(
		views.map((v) => (v.identity.kind === 'wallet' ? v.identity.address : v.identity.handle))
	).size;

	return {
		view: 'release' as const,
		project,
		release: release ?? { tag, commit: null, publishedAt: null, url: null, prerelease: false },
		cohorts,
		total: views.length,
		distinctIdentities,
		anyDivergent: cohorts.some((c) => c.divergent)
	};
};
