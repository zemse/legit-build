import { randomBytes } from 'node:crypto';
import { redirect } from '@sveltejs/kit';
import { authorizeUrl } from '$lib/server/github-oauth';
import type { RequestHandler } from './$types';

// GET /auth/github?returnTo=/attest/<uuid> -> redirect to GitHub authorize
export const GET: RequestHandler = ({ url, cookies }) => {
	const state = randomBytes(16).toString('hex');
	const returnTo = url.searchParams.get('returnTo') ?? '/';

	const opts = { path: '/', httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: 600 };
	cookies.set('gh_state', state, opts);
	cookies.set('gh_return', /^\/(?![/\\])/.test(returnTo) ? returnTo : '/', opts);

	throw redirect(302, authorizeUrl(state, `${url.origin}/auth/github/callback`));
};
