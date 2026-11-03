import { timingSafeEqual } from 'node:crypto';
import { error, json } from '@sveltejs/kit';
import { completeSession, getSession } from '$lib/server/sessions';
import type { RequestHandler } from './$types';

function tokenOk(request: Request, expected: string): boolean {
	const h = request.headers.get('authorization') ?? '';
	const m = h.match(/^Bearer\s+(.+)$/i);
	if (!m) return false;
	const a = Buffer.from(m[1]);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

// POST /api/sessions/:uuid/complete (auth: Bearer uploadToken) -> state results_ready
export const POST: RequestHandler = async ({ params, request }) => {
	const row = await getSession(params.uuid);
	if (!row) throw error(404, 'Unknown session');
	if (!tokenOk(request, row.uploadToken)) throw error(401, 'bad upload token');
	const ok = await completeSession(params.uuid);
	if (!ok) throw error(409, 'cannot complete (expired?)');
	return json({ ok: true });
};
