import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clients, releases } from '$lib/server/db/schema';
import { buildCohorts, getReleaseAttestations } from '$lib/server/attestations';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=30' });
	const tag = decodeURIComponent(params.tag);

	const [client] = await db.select().from(clients).where(eq(clients.id, params.client)).limit(1);
	if (!client) throw error(404, 'Unknown client');

	const [release] = await db
		.select()
		.from(releases)
		.where(and(eq(releases.clientId, params.client), eq(releases.tag, tag)))
		.limit(1);

	const views = await getReleaseAttestations(params.client, tag);
	const cohorts = buildCohorts(views);
	const distinctIdentities = new Set(
		views.map((v) => (v.identity.kind === 'wallet' ? v.identity.address : v.identity.handle))
	).size;

	return {
		client,
		release: release ?? { tag, commit: null, publishedAt: null, url: null, prerelease: false },
		cohorts,
		total: views.length,
		distinctIdentities,
		anyDivergent: cohorts.some((c) => c.divergent)
	};
};
