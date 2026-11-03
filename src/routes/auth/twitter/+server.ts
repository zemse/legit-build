import { randomBytes } from 'node:crypto';
import { redirect } from '@sveltejs/kit';
import { authorizeUrl, pkcePair } from '$lib/server/twitter';
import type { RequestHandler } from './$types';

// GET /auth/twitter?returnTo=/attest/<uuid> -> redirect to X authorize
export const GET: RequestHandler = ({ url, cookies }) => {
	const { verifier, challenge } = pkcePair();
	const state = randomBytes(16).toString('hex');
	const returnTo = url.searchParams.get('returnTo') ?? '/';

	const opts = { path: '/', httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: 600 };
	cookies.set('tw_verifier', verifier, opts);
	cookies.set('tw_state', state, opts);
	cookies.set('tw_return', returnTo, opts);

	throw redirect(302, authorizeUrl(state, challenge));
};
