import { randomUUID, timingSafeEqual } from 'node:crypto';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { storeSubjects } from '$lib/server/attestations';
import { signIssuerAttestation } from '$lib/server/eas';
import { getSession, markAttested } from '$lib/server/sessions';
import { composePost } from '$lib/server/x-proof';
import { EAS_SCHEMA_UID } from '$lib/eas/config';
import { resultsToBatchFields } from '$lib/eas/schema';
import type { TwitterIdentity } from '$lib/types';
import type { RequestHandler } from './$types';

function sameToken(a: string, b: string): boolean {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
}

// POST /api/attest/twitter {sessionUuid, uploadToken, approved: number[]}
// Trusted-issuer path (spec §5.3): records the authenticated X account as the
// identity, signed with the issuer key when one is configured. Only the browser
// that created the session (holder of its uploadToken) may attest its results.
export const POST: RequestHandler = async ({ request, locals }) => {
	const twitter = locals.twitter as TwitterIdentity | undefined;
	if (!twitter) throw error(401, 'not signed in with X');

	const body = (await request.json().catch(() => null)) as {
		sessionUuid?: string;
		uploadToken?: string;
		approved?: number[];
	} | null;
	if (!body?.sessionUuid) throw error(400, 'sessionUuid required');

	const session = await getSession(body.sessionUuid);
	if (!session) throw error(404, 'Unknown session');
	if (!body.uploadToken || !sameToken(body.uploadToken, session.uploadToken)) {
		throw error(403, 'Open this page in the browser that started the session to attest it');
	}

	const approved = Array.isArray(body.approved) ? body.approved : session.results.map((_, i) => i);
	const results = approved.map((i) => session.results[i]).filter(Boolean);
	if (results.length === 0) throw error(400, 'no approved results');

	const identity: TwitterIdentity = {
		kind: 'twitter',
		userId: twitter.userId,
		handle: twitter.handle
	};

	// Issuer signature is optional: the public X post is the user-controlled proof.
	let uid = `x:${randomUUID()}`;
	let raw: Record<string, unknown> = { twitter: identity };
	if (env.EAS_ISSUER_PRIVATE_KEY && EAS_SCHEMA_UID) {
		const { uid: easUid, signed, attester } = await signIssuerAttestation(results);
		uid = easUid;
		raw = { ...raw, signed, issuer: attester };
	}

	const fields = resultsToBatchFields(results);
	const subjects = fields.project.map((_, i) => ({
		project: fields.project[i],
		version: fields.version[i],
		osArch: fields.osArch[i],
		artifactHash: fields.artifactHash[i],
		sourceCommit: fields.sourceCommit[i],
		recipeHash: fields.recipeHash[i],
		toolchainHash: fields.toolchainHash[i]
	}));

	const attester = `twitter:${twitter.userId}`;
	const stored = await storeSubjects({
		subjects,
		identity,
		attester,
		source: 'db',
		uidPrefix: uid,
		sessionUuid: body.sessionUuid,
		raw
	});

	await markAttested(body.sessionUuid);
	const post = await composePost(
		subjects.map((s) => ({ ...s, attester })),
		twitter.handle
	);
	return json({ ok: true, stored, uid, post });
};
