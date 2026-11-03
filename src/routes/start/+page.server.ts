import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(projects);
	return { projects: rows.sort((a, b) => (a.name ?? a.repo).localeCompare(b.name ?? b.repo)) };
};
