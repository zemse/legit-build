import * as openpgp from 'openpgp';
import { env } from '$env/dynamic/private';
import type { BuildResult } from '$lib/types';
import { canonicalize } from './jcs';

// GitHub signing identity (spec 11/12). A builder signs the canonical result
// payload with their git GPG key; we verify it against the public keys GitHub
// serves for the claimed username. Vercel's runtime has no gpg binary, so the
// verification is pure JS via openpgp. SSH signing is deferred (no mature JS
// verifier); only GPG is wired here.

// Exactly the 10 result fields are signed, in canonical form. The signature
// fields and any server-added metadata are excluded from the signed payload.
const SIGNED_FIELDS = [
	'project',
	'version',
	'tag',
	'sourceCommit',
	'recipeRepoCommit',
	'osArch',
	'artifactHash',
	'toolchainHash',
	'buildLogSha256',
	'environment'
] as const;

/** RFC 8785 canonical JSON over exactly the 10 signed fields. */
export function canonicalResultPayload(result: BuildResult): string {
	const subset: Record<string, string> = {};
	for (const k of SIGNED_FIELDS) subset[k] = String(result[k] ?? '');
	return canonicalize(subset);
}

interface KeyCacheEntry {
	armored: string | null;
	at: number;
}
const KEY_TTL_MS = 60 * 60 * 1000; // 1h, per spec 12
const keyCache = new Map<string, KeyCacheEntry>();

/** The armored GPG public key block GitHub serves for a user, or null if none. */
async function fetchGpgArmored(username: string): Promise<string | null> {
	const hit = keyCache.get(username);
	if (hit && Date.now() - hit.at < KEY_TTL_MS) return hit.armored;
	let armored: string | null = null;
	try {
		const res = await fetch(`https://github.com/${encodeURIComponent(username)}.gpg`, {
			headers: { 'user-agent': 'legit.build' }
		});
		if (res.ok) {
			const text = await res.text();
			// GitHub returns a short comment block for users with no GPG keys.
			if (text.includes('BEGIN PGP PUBLIC KEY BLOCK')) armored = text;
		}
	} catch {
		armored = null;
	}
	keyCache.set(username, { armored, at: Date.now() });
	return armored;
}

/** Stable numeric account id (logins are mutable); null if the user can't be resolved. */
async function resolveUserId(username: string): Promise<number | null> {
	const headers: Record<string, string> = {
		accept: 'application/vnd.github+json',
		'user-agent': 'legit.build'
	};
	if (env.GITHUB_TOKEN) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
	try {
		const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
			headers
		});
		if (!res.ok) return null;
		const j = (await res.json()) as { id?: number };
		return typeof j.id === 'number' ? j.id : null;
	} catch {
		return null;
	}
}

export interface GpgVerifyResult {
	ok: boolean;
	login: string;
	userId: number | null;
	keyFingerprint: string | null;
}

/**
 * Verify an armored, detached GPG signature over the canonical result payload
 * against the GitHub user's published keys. A verifying signature proves the
 * claimed username controls that key (there is no reverse key->user lookup).
 */
export async function verifyGpgSignature(
	username: string,
	result: BuildResult,
	armoredSignature: string
): Promise<GpgVerifyResult> {
	const fail: GpgVerifyResult = { ok: false, login: username, userId: null, keyFingerprint: null };
	try {
		const armoredKey = await fetchGpgArmored(username);
		if (!armoredKey) return fail;

		const [publicKeys, signature] = await Promise.all([
			openpgp.readKeys({ armoredKeys: armoredKey }),
			openpgp.readSignature({ armoredSignature })
		]);
		// gpg --detach-sign makes a binary-document signature over the raw bytes.
		const message = await openpgp.createMessage({
			binary: new TextEncoder().encode(canonicalResultPayload(result))
		});
		const { signatures } = await openpgp.verify({
			message,
			signature,
			verificationKeys: publicKeys
		});
		const sig = signatures[0];
		if (!sig) return fail;

		let valid = false;
		try {
			valid = await sig.verified;
		} catch {
			valid = false;
		}
		if (!valid) return fail;

		// Fingerprint of the key that actually signed (may be a subkey).
		let fingerprint: string | null = null;
		for (const k of publicKeys) {
			try {
				const sk = await k.getSigningKey(sig.keyID);
				if (sk) {
					fingerprint = sk.getFingerprint();
					break;
				}
			} catch {
				/* not this key */
			}
		}

		const userId = await resolveUserId(username);
		return { ok: true, login: username, userId, keyFingerprint: fingerprint };
	} catch {
		return fail;
	}
}
