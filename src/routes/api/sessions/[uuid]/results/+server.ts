import { timingSafeEqual } from 'node:crypto';
import { error, json } from '@sveltejs/kit';
import { appendResult, getSession, MAX_RESULT_BYTES } from '$lib/server/sessions';
import type { BuildResult } from '$lib/types';
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
	'client',
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

function validate(v: unknown): BuildResult | null {
	if (!v || typeof v !== 'object') return null;
	const o = v as Record<string, unknown>;
	for (const k of REQUIRED) if (typeof o[k] !== 'string') return null;
	return o as unknown as BuildResult;
}

// POST /api/sessions/:uuid/results  (auth: Bearer uploadToken)  {result}
export const POST: RequestHandler = async ({ params, request }) => {
	const raw = await request.text();
	if (raw.length > MAX_RESULT_BYTES) throw error(413, 'result too large');

	const row = await getSession(params.uuid);
	if (!row) throw error(404, 'Unknown session');
	if (!tokenOk(bearer(request), row.uploadToken)) throw error(401, 'bad upload token');

	const parsed = JSON.parse(raw) as { result?: unknown };
	const result = validate(parsed.result);
	if (!result) throw error(400, 'invalid result shape');
	if (!row.clients.includes(result.client))
		throw error(400, `client ${result.client} not in session`);

	const seq = await appendResult(params.uuid, result);
	if (seq === null) throw error(409, 'session not accepting results (expired?)');
	return json({ ok: true, seq });
};
