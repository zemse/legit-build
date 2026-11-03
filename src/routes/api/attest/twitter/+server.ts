import { error, json } from '@sveltejs/kit';
import { storeSubjects } from '$lib/server/attestations';
import { signIssuerAttestation } from '$lib/server/eas';
import { getSession, markAttested } from '$lib/server/sessions';
import { resultsToBatchFields } from '$lib/eas/schema';
import type { TwitterIdentity } from '$lib/types';
import type { RequestHandler } from './$types';

// POST /api/attest/twitter {sessionUuid, approved: number[]}
// Trusted-issuer path (spec §5.3): backend signs the batch with the issuer key,
// recording the authenticated X handle as the identity.
export const POST: RequestHandler = async ({ request, locals }) => {
	const twitter = locals.twitter as TwitterIdentity | undefined;
	if (!twitter) throw error(401, 'not signed in with Twitter');

	const body = (await request.json().catch(() => null)) as {
		sessionUuid?: string;
		approved?: number[];
	} | null;
	if (!body?.sessionUuid) throw error(400, 'sessionUuid required');

	const session = await getSession(body.sessionUuid);
	if (!session) throw error(404, 'Unknown session');

	const approved = Array.isArray(body.approved) ? body.approved : session.results.map((_, i) => i);
	const results = approved.map((i) => session.results[i]).filter(Boolean);
	if (results.length === 0) throw error(400, 'no approved results');

	const { uid, signed, attester } = await signIssuerAttestation(results);

	const fields = resultsToBatchFields(results);
	const subjects = fields.client.map((_, i) => ({
		client: fields.client[i],
		version: fields.version[i],
		osArch: fields.osArch[i],
		artifactHash: fields.artifactHash[i],
		sourceCommit: fields.sourceCommit[i],
		recipeHash: fields.recipeHash[i],
		toolchainHash: fields.toolchainHash[i]
	}));

	const identity: TwitterIdentity = twitter;
	const stored = await storeSubjects({
		subjects,
		identity,
		attester: `twitter:${twitter.userId}`,
		source: 'db',
		uidPrefix: uid,
		sessionUuid: body.sessionUuid,
		raw: { signed, issuer: attester }
	});

	await markAttested(body.sessionUuid);
	return json({ ok: true, stored, uid });
};
