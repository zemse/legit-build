import { error, json } from '@sveltejs/kit';
import { getSession, toPublic } from '$lib/server/sessions';
import type { RequestHandler } from './$types';

// GET /api/sessions/:uuid -> full current public state (reconnect/poll fallback, spec §7).
export const GET: RequestHandler = async ({ params }) => {
	const row = await getSession(params.uuid);
	if (!row) throw error(404, 'Unknown session');
	return json(toPublic(row));
};
