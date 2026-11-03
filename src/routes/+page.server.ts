import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { projects, releases } from '$lib/server/db/schema';
import { countByProjectVersion } from '$lib/server/attestations';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60' });

	const [allProjects, allReleases, counts] = await Promise.all([
		db.select().from(projects),
		db.select().from(releases).orderBy(desc(releases.publishedAt)),
		countByProjectVersion()
	]);

	// Latest STABLE release per project for the home card (releases already sorted
	// newest first). Prereleases are not shown here; fall back to the newest release
	// only if a project has no stable release at all.
	const latestStable = new Map<string, (typeof allReleases)[number]>();
	const latestAny = new Map<string, (typeof allReleases)[number]>();
	for (const r of allReleases) {
		if (!latestAny.has(r.projectId)) latestAny.set(r.projectId, r);
		if (!r.prerelease && !latestStable.has(r.projectId)) latestStable.set(r.projectId, r);
	}
	const latest = (projectId: string) =>
		latestStable.get(projectId) ?? latestAny.get(projectId) ?? null;

	const rows = allProjects
		.map((p) => {
			const latestRel = latest(p.id);
			return {
				...p,
				latest: latestRel,
				// Attestations on the latest release specifically (spec: default view).
				attestations: latestRel ? counts[`${p.id}@${latestRel.tag}`] ?? 0 : 0
			};
		})
		.sort((a, b) => (a.name ?? a.repo).localeCompare(b.name ?? b.repo));

	return {
		execution: rows.filter((r) => r.layer === 'execution'),
		consensus: rows.filter((r) => r.layer === 'consensus'),
		other: rows.filter((r) => r.layer !== 'execution' && r.layer !== 'consensus')
	};
};
