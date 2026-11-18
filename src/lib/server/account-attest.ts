import { randomUUID, timingSafeEqual } from 'node:crypto';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { storeSubjects } from './attestations';
import { signIssuerAttestation } from './eas';
import { getSession, markAttested } from './sessions';
import { EAS_SCHEMA_UID } from '$lib/eas/config';
import { resultsToBatchFields, type DecodedSubject } from '$lib/eas/schema';
import type { Identity } from '$lib/types';

function sameToken(a: string, b: string): boolean {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Trusted-issuer path (spec §5.3) for a signed-in account (X or GitHub): records the
 * account as the identity, signed with the issuer key when one is configured. Only the
 * browser that created the session (holder of its uploadToken) may attest its results.
 */
export async function attestAsAccount(
	request: Request,
	identity: Identity,
	attester: string
): Promise<{ uid: string; stored: number; subjects: DecodedSubject[] }> {
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

	const prefix = identity.kind === 'twitter' ? 'x' : identity.kind;
	let uid = `${prefix}:${randomUUID()}`;
	let raw: Record<string, unknown> = { [identity.kind]: identity };
	if (env.EAS_ISSUER_PRIVATE_KEY && EAS_SCHEMA_UID) {
		const { uid: easUid, signed, attester: issuer } = await signIssuerAttestation(results);
		uid = easUid;
		raw = { ...raw, signed, issuer };
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
	return { uid, stored, subjects };
}
