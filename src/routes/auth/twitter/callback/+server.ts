import { error, redirect } from '@sveltejs/kit';
import { setIdentity } from '$lib/server/auth';
import { exchangeCode, fetchMe } from '$lib/server/twitter';
import type { RequestHandler } from './$types';

// GET /auth/twitter/callback?code=&state=
export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expectedState = cookies.get('tw_state');
	const verifier = cookies.get('tw_verifier');
	const returnTo = cookies.get('tw_return') ?? '/';

	if (!code || !state || !verifier || state !== expectedState) {
		throw error(400, 'invalid oauth callback');
	}

	const { accessToken } = await exchangeCode(code, verifier);
	const me = await fetchMe(accessToken);

	setIdentity(cookies, { kind: 'twitter', userId: me.id, handle: me.username });
	for (const c of ['tw_state', 'tw_verifier', 'tw_return']) cookies.delete(c, { path: '/' });

	throw redirect(302, returnTo);
};
