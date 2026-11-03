import { error, text } from '@sveltejs/kit';
import { getSession } from '$lib/server/sessions';
import { buildAgentInstructions } from '$lib/server/instructions';
import type { RequestHandler } from './$types';

// GET /attest/:uuid/llms.txt -> markdown instructions for the agent (spec §6).
export const GET: RequestHandler = async ({ params, url }) => {
	const session = await getSession(params.uuid);
	if (!session) throw error(404, 'Unknown session');
	const md = await buildAgentInstructions(url.origin, session);
	return text(md, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
};
