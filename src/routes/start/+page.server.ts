import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(clients);
	return { clients: rows.sort((a, b) => a.name.localeCompare(b.name)) };
};
