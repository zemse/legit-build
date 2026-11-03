import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { projects, releases } from '$lib/server/db/schema';
import { countByProject } from '$lib/server/attestations';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60' });

	const [allProjects, allReleases, counts] = await Promise.all([
		db.select().from(projects),
		db.select().from(releases).orderBy(desc(releases.publishedAt)),
		countByProject()
	]);

	// Latest release per project (releases already sorted newest first).
	const latest = new Map<string, (typeof allReleases)[number]>();
	for (const r of allReleases) if (!latest.has(r.projectId)) latest.set(r.projectId, r);

	const rows = allProjects
		.map((p) => ({
			...p,
			latest: latest.get(p.id) ?? null,
			attestations: counts[p.id] ?? 0
		}))
		.sort((a, b) => (a.name ?? a.repo).localeCompare(b.name ?? b.repo));

	return {
		execution: rows.filter((r) => r.layer === 'execution'),
		consensus: rows.filter((r) => r.layer === 'consensus'),
		other: rows.filter((r) => r.layer !== 'execution' && r.layer !== 'consensus')
	};
};
