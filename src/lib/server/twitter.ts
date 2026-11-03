import { createHash, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';

const AUTHORIZE = 'https://twitter.com/i/oauth2/authorize';
const TOKEN = 'https://api.twitter.com/2/oauth2/token';
const ME = 'https://api.twitter.com/2/users/me';
const SCOPES = 'tweet.read users.read';

function b64url(buf: Buffer): string {
	return buf.toString('base64url');
}

export function pkcePair(): { verifier: string; challenge: string } {
	const verifier = b64url(randomBytes(48));
	const challenge = b64url(createHash('sha256').update(verifier).digest());
	return { verifier, challenge };
}

export function authorizeUrl(state: string, challenge: string): string {
	const redirect = pub.PUBLIC_TWITTER_REDIRECT_URI ?? '';
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: env.TWITTER_CLIENT_ID ?? '',
		redirect_uri: redirect,
		scope: SCOPES,
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256'
	});
	return `${AUTHORIZE}?${params}`;
}

export async function exchangeCode(
	code: string,
	verifier: string
): Promise<{ accessToken: string }> {
	const redirect = pub.PUBLIC_TWITTER_REDIRECT_URI ?? '';
	const basic = Buffer.from(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`).toString(
		'base64'
	);
	const res = await fetch(TOKEN, {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			authorization: `Basic ${basic}`
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirect,
			code_verifier: verifier
		})
	});
	if (!res.ok) throw new Error(`Twitter token exchange failed: ${res.status} ${await res.text()}`);
	const json = (await res.json()) as { access_token: string };
	return { accessToken: json.access_token };
}

export async function fetchMe(accessToken: string): Promise<{ id: string; username: string }> {
	const res = await fetch(ME, { headers: { authorization: `Bearer ${accessToken}` } });
	if (!res.ok) throw new Error(`Twitter /users/me failed: ${res.status}`);
	const json = (await res.json()) as { data: { id: string; username: string } };
	return { id: json.data.id, username: json.data.username };
}
