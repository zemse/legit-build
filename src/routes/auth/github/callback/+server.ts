import { error, redirect } from '@sveltejs/kit';
import { safeReturnTo, setIdentity } from '$lib/server/auth';
import { exchangeCode, fetchMe, primeFollowing } from '$lib/server/github-oauth';
import type { RequestHandler } from './$types';

// GET /auth/github/callback?code=&state=
export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expectedState = cookies.get('gh_state');
	const returnTo = safeReturnTo(cookies.get('gh_return'));

	if (!code || !state || state !== expectedState) throw error(400, 'invalid oauth callback');

	const token = await exchangeCode(code, `${url.origin}/auth/github/callback`);
	const me = await fetchMe(token);
	// Best effort: the network view refetches with the server token if this fails.
	await primeFollowing(me, token).catch(() => {});

	setIdentity(cookies, {
		kind: 'github',
		login: me.login,
		userId: me.id,
		keyFingerprint: null,
		keyType: 'oauth'
	});
	for (const c of ['gh_state', 'gh_return']) cookies.delete(c, { path: '/' });

	throw redirect(302, returnTo);
};
