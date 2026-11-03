import { desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clients, releases } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60' });
	const [client] = await db.select().from(clients).where(eq(clients.id, params.client)).limit(1);
	if (!client) throw error(404, 'Unknown client');
	const rels = await db
		.select()
		.from(releases)
		.where(eq(releases.clientId, params.client))
		.orderBy(desc(releases.publishedAt));
	return { client, releases: rels };
};
