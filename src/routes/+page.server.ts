import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { clients, releases } from '$lib/server/db/schema';
import { countByClient } from '$lib/server/attestations';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60' });

	const [allClients, allReleases, counts] = await Promise.all([
		db.select().from(clients),
		db.select().from(releases).orderBy(desc(releases.publishedAt)),
		countByClient()
	]);

	// Latest release per client (releases already sorted newest first).
	const latest = new Map<string, (typeof allReleases)[number]>();
	for (const r of allReleases) if (!latest.has(r.clientId)) latest.set(r.clientId, r);

	const rows = allClients
		.map((c) => ({
			...c,
			latest: latest.get(c.id) ?? null,
			attestations: counts[c.id] ?? 0
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		execution: rows.filter((r) => r.layer === 'execution'),
		consensus: rows.filter((r) => r.layer === 'consensus')
	};
};
