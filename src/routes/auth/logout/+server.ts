import { json } from '@sveltejs/kit';
import { clearIdentity } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies }) => {
	clearIdentity(cookies);
	return json({ ok: true });
};
