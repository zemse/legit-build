import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects as projectsTable } from '$lib/server/db/schema';
import { createSession, MAX_PROJECTS } from '$lib/server/sessions';
import type { RequestHandler } from './$types';

// POST /api/sessions {projects[], instructions?} -> {uuid, uploadToken, attestUrl, instructionsUrl}
// The uploadToken is returned ONLY here, to the creating browser (spec §7 capability model).
export const POST: RequestHandler = async ({ request, url }) => {
	const body = (await request.json().catch(() => null)) as {
		projects?: unknown;
		instructions?: unknown;
	} | null;

	const requested = Array.isArray(body?.projects) ? body.projects.map(String) : [];
	const known = await db.select({ id: projectsTable.id }).from(projectsTable);
	const knownIds = new Set(known.map((k) => k.id));

	// Default to all pinned projects when none specified: the contribute popup
	// provisions one global session per user that can build anything.
	let selected = requested.filter((p) => knownIds.has(p));
	if (selected.length === 0) selected = known.map((k) => k.id);
	if (selected.length === 0) throw error(400, 'no projects configured');
	if (selected.length > MAX_PROJECTS) selected = selected.slice(0, MAX_PROJECTS);

	const instructions =
		typeof body?.instructions === 'string' ? body.instructions.slice(0, 4000) : null;

	const { uuid, uploadToken } = await createSession(selected, instructions);

	return json({
		uuid,
		uploadToken,
		attestUrl: `${url.origin}/attest/${uuid}`,
		instructionsUrl: `${url.origin}/attest/${uuid}/llms.txt`,
		contributeLine: `${url.origin}/contribute uuid=${uuid}`
	});
};
