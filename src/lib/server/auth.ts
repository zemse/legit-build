import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Identity } from '$lib/types';

const COOKIE = 'lb_identity';
const SECRET = env.AUTH_SECRET ?? 'dev-insecure-secret-change-me';

function sign(data: string): string {
	return createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function encodeIdentity(id: Identity): string {
	const body = Buffer.from(JSON.stringify(id)).toString('base64url');
	return `${body}.${sign(body)}`;
}

export function decodeIdentity(value: string | undefined): Identity | null {
	if (!value) return null;
	const [body, mac] = value.split('.');
	if (!body || !mac) return null;
	const expected = sign(body);
	const a = Buffer.from(mac);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	try {
		return JSON.parse(Buffer.from(body, 'base64url').toString()) as Identity;
	} catch {
		return null;
	}
}

export function setIdentity(cookies: Cookies, id: Identity): void {
	cookies.set(COOKIE, encodeIdentity(id), {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7
	});
}

export function clearIdentity(cookies: Cookies): void {
	cookies.delete(COOKIE, { path: '/' });
}

export const IDENTITY_COOKIE = COOKIE;
