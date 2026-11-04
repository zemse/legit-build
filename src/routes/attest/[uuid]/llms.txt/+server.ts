import { error, text } from '@sveltejs/kit';
import { getSession } from '$lib/server/sessions';
import { buildAgentInstructions } from '$lib/server/instructions';
import type { RequestHandler } from './$types';

// GET /attest/:uuid/llms.txt -> pure text instructions for the agent (spec §6).
// Served as text/plain (like /contribute and /llms.txt): a .txt agent endpoint, no
// HTML, so clients render it verbatim (RFC 2046 text/plain).
export const GET: RequestHandler = async ({ params, url }) => {
	const session = await getSession(params.uuid);
	if (!session) throw error(404, 'Unknown session');
	const md = await buildAgentInstructions(url.origin, session);
	return text(md, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
