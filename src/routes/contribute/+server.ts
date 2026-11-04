import { text } from '@sveltejs/kit';
import contributePrompt from '$lib/contribute-prompt.txt?raw';
import type { RequestHandler } from './$types';

// GET /contribute  (the pasted line is "<origin>/contribute uuid=xxxx")
// Pure text, for AI agents: always text/plain, no HTML/JS. The prompt is generic and
// carries NO session secret; the agent fetches /attest/<uuid>/llms.txt for the
// uploadToken + projects (two-hop, spec §7). Source: src/lib/contribute-prompt.txt.
export const GET: RequestHandler = ({ url }) => {
	// Point the example URLs at this deployment's origin (prod, preview, local).
	const prompt = contributePrompt.replaceAll('https://legit.build', url.origin);
	return text(prompt, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
