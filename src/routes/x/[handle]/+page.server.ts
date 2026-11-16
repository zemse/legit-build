import { and, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attestations } from '$lib/server/db/schema';
import { toView } from '$lib/server/attestations';
import type { PageServerLoad } from './$types';

// Public profile: every attestation published under an X handle.
export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=30' });
	const rows = await db
		.select()
		.from(attestations)
		.where(
			and(
				sql`${attestations.identity}->>'kind' = 'twitter'`,
				sql`lower(${attestations.identity}->>'handle') = lower(${params.handle})`
			)
		)
		.orderBy(desc(attestations.createdAt))
		.limit(500);
	return { handle: params.handle, items: rows.map(toView) };
};
