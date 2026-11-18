import { error, json } from '@sveltejs/kit';
import { attestAsAccount } from '$lib/server/account-attest';
import { composePost } from '$lib/server/x-proof';
import type { TwitterIdentity } from '$lib/types';
import type { RequestHandler } from './$types';

// POST /api/attest/twitter {sessionUuid, uploadToken, approved: number[]}
// Issuer signature is optional: the public X post is the user-controlled proof.
export const POST: RequestHandler = async ({ request, locals }) => {
	const twitter = locals.twitter;
	if (!twitter) throw error(401, 'not signed in with X');

	const identity: TwitterIdentity = {
		kind: 'twitter',
		userId: twitter.userId,
		handle: twitter.handle
	};
	const attester = `twitter:${twitter.userId}`;
	const { uid, stored, subjects } = await attestAsAccount(request, identity, attester);
	const post = await composePost(
		subjects.map((s) => ({ ...s, attester })),
		twitter.handle
	);
	return json({ ok: true, stored, uid, post });
};
