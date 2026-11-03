import { createHash, timingSafeEqual } from 'node:crypto';
import { error, json } from '@sveltejs/kit';
import { storeSubjects } from '$lib/server/attestations';
import { canonicalResultPayload, verifyGpgSignature } from '$lib/server/github-verify';
import { appendResult, getSession, MAX_RESULT_BYTES } from '$lib/server/sessions';
import { resultsToBatchFields } from '$lib/eas/schema';
import type { BuildResult, GitHubIdentity } from '$lib/types';
import type { RequestHandler } from './$types';

function bearer(request: Request): string | null {
	const h = request.headers.get('authorization') ?? '';
	const m = h.match(/^Bearer\s+(.+)$/i);
	return m ? m[1] : null;
}

function tokenOk(provided: string | null, expected: string): boolean {
	if (!provided) return false;
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

const REQUIRED: (keyof BuildResult)[] = [
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
];

/** Keep only the 10 trusted fields; strips any agent-supplied githubSig/signature spoof. */
function pick(o: Record<string, unknown>): BuildResult | null {
	for (const k of REQUIRED) if (typeof o[k] !== 'string') return null;
	const r = {} as Record<string, string>;
	for (const k of REQUIRED) r[k] = o[k] as string;
	return r as unknown as BuildResult;
}

// POST /api/sessions/:uuid/results  (auth: Bearer uploadToken)
// Body: { result: { ...10 fields, githubUsername?, gpgSignature? } }
// A valid GPG signature is self-authorizing: we write a source:"github"
// attestation immediately (no browser step). Invalid signatures are stored
// unsigned and flagged; the user falls back to wallet/Twitter in the browser.
export const POST: RequestHandler = async ({ params, request }) => {
	const raw = await request.text();
	if (raw.length > MAX_RESULT_BYTES) throw error(413, 'result too large');

	const row = await getSession(params.uuid);
	if (!row) throw error(404, 'Unknown session');
	if (!tokenOk(bearer(request), row.uploadToken)) throw error(401, 'bad upload token');

	const parsed = JSON.parse(raw) as { result?: unknown };
	if (!parsed.result || typeof parsed.result !== 'object') throw error(400, 'invalid result shape');
	const input = parsed.result as Record<string, unknown>;
	const result = pick(input);
	if (!result) throw error(400, 'invalid result shape');
	if (!row.projects.includes(result.project))
		throw error(400, `project ${result.project} not in session`);

	// Optional GitHub signing. SSH is accepted in the shape but not yet verified.
	const githubUsername = typeof input.githubUsername === 'string' ? input.githubUsername : null;
	const gpgSignature = typeof input.gpgSignature === 'string' ? input.gpgSignature : null;
	let githubIdentity: GitHubIdentity | null = null;
	if (githubUsername && gpgSignature) {
		const v = await verifyGpgSignature(githubUsername, result, gpgSignature);
		result.githubSig = {
			status: v.ok ? 'valid' : 'invalid',
			login: v.login,
			userId: v.userId,
			keyType: 'gpg'
		};
		if (v.ok) {
			githubIdentity = {
				kind: 'github',
				login: v.login,
				userId: v.userId,
				keyFingerprint: v.keyFingerprint,
				keyType: 'gpg'
			};
		}
	}

	const seq = await appendResult(params.uuid, result);
	if (seq === null) throw error(409, 'session not accepting results (expired?)');

	// A verified GitHub signature is a complete attestation on its own.
	if (githubIdentity) {
		const f = resultsToBatchFields([result]);
		const subject = {
			project: f.project[0],
			version: f.version[0],
			osArch: f.osArch[0],
			artifactHash: f.artifactHash[0],
			sourceCommit: f.sourceCommit[0],
			recipeHash: f.recipeHash[0],
			toolchainHash: f.toolchainHash[0]
		};
		const who =
			githubIdentity.userId != null ? String(githubIdentity.userId) : githubIdentity.login;
		const digest = createHash('sha256').update(canonicalResultPayload(result)).digest('hex');
		await storeSubjects({
			subjects: [subject],
			identity: githubIdentity,
			attester: `github:${who}`,
			source: 'github',
			uidPrefix: `github:${who}:${digest}`,
			sessionUuid: params.uuid,
			raw: { githubUsername, gpgSignature }
		});
	}

	return json({ ok: true, seq, github: result.githubSig?.status ?? null });
};
