import { text } from '@sveltejs/kit';
import contributePrompt from '$lib/contribute-prompt.txt?raw';
import type { RequestHandler } from './$types';

// GET /contribute  (the pasted line is "<origin>/contribute uuid=xxxx")
// Content-negotiated. Agents (text/plain) get the context-free bootstrap prompt;
// browsers get a pointer. The prompt is generic and carries NO session secret: the
// agent fetches /attest/<uuid>/llms.txt for the uploadToken + projects (two-hop,
// spec §7 capability model). Canonical source: src/lib/contribute-prompt.txt.
export const GET: RequestHandler = ({ request, url }) => {
	const accept = request.headers.get('accept') ?? '';
	if (accept.includes('text/html')) {
		return new Response(
			`<!doctype html><meta charset=utf-8><title>legit.build /contribute</title>` +
				`<body style="font-family:system-ui;background:#09090b;color:#e4e4e7;max-width:40rem;margin:4rem auto;padding:0 1rem">` +
				`<h1>legit.build: agent entrypoint</h1>` +
				`<p>This URL is meant to be fetched by your coding agent together with a <code>uuid</code> ` +
				`from the line you copied. See <a style="color:#34d399" href="/about">how it works</a>.</p>`,
			{ headers: { 'content-type': 'text/html; charset=utf-8' } }
		);
	}

	// Point the example URLs at this deployment's origin (prod, preview, local).
	const prompt = contributePrompt.replaceAll('https://legit.build', url.origin);
	return text(prompt, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
