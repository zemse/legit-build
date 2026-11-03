import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clients as clientsTable } from '$lib/server/db/schema';
import { createSession, MAX_CLIENTS } from '$lib/server/sessions';
import type { RequestHandler } from './$types';

// POST /api/sessions {clients[], instructions?} -> {uuid, uploadToken, attestUrl, instructionsUrl}
// The uploadToken is returned ONLY here, to the creating browser (spec §7 capability model).
export const POST: RequestHandler = async ({ request, url }) => {
	const body = (await request.json().catch(() => null)) as {
		clients?: unknown;
		instructions?: unknown;
	} | null;
	if (!body || !Array.isArray(body.clients) || body.clients.length === 0) {
		throw error(400, 'clients[] required');
	}
	if (body.clients.length > MAX_CLIENTS) throw error(400, `max ${MAX_CLIENTS} clients per session`);

	const requested = body.clients.map(String);
	const known = await db.select({ id: clientsTable.id }).from(clientsTable);
	const knownIds = new Set(known.map((k) => k.id));
	const selected = requested.filter((c) => knownIds.has(c));
	if (selected.length === 0) throw error(400, 'no known clients in selection');

	const instructions =
		typeof body.instructions === 'string' ? body.instructions.slice(0, 4000) : null;

	const { uuid, uploadToken } = await createSession(selected, instructions);

	return json({
		uuid,
		uploadToken,
		attestUrl: `${url.origin}/attest/${uuid}`,
		instructionsUrl: `${url.origin}/attest/${uuid}?format=md`,
		contributeLine: `${url.origin}/contribute uuid=${uuid}`
	});
};
