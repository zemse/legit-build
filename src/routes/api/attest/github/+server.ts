import { error, json } from '@sveltejs/kit';
import { attestAsAccount } from '$lib/server/account-attest';
import type { GitHubIdentity } from '$lib/types';
import type { RequestHandler } from './$types';

// POST /api/attest/github {sessionUuid, uploadToken, approved: number[]}
// Same attester id as GPG-signed results, so both show under one GitHub account.
export const POST: RequestHandler = async ({ request, locals }) => {
	const github = locals.github;
	if (!github?.userId) throw error(401, 'not signed in with GitHub');

	const identity: GitHubIdentity = {
		kind: 'github',
		login: github.login,
		userId: github.userId,
		keyFingerprint: null,
		keyType: 'oauth'
	};
	const { uid, stored } = await attestAsAccount(request, identity, `github:${github.userId}`);
	return json({ ok: true, stored, uid });
};
