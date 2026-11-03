import { randomBytes } from 'node:crypto';
import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /auth/siwe/nonce -> plain nonce, also stored in a short-lived cookie.
export const GET: RequestHandler = ({ cookies }) => {
	const nonce = randomBytes(16).toString('hex');
	cookies.set('siwe_nonce', nonce, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600
	});
	return text(nonce);
};
