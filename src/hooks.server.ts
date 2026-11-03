import type { Handle } from '@sveltejs/kit';
import { decodeIdentity, IDENTITY_COOKIE } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const id = decodeIdentity(event.cookies.get(IDENTITY_COOKIE));
	if (id?.kind === 'twitter') event.locals.twitter = id;
	if (id?.kind === 'wallet') event.locals.wallet = id;
	return resolve(event);
};
