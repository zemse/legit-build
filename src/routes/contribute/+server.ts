import { text } from '@sveltejs/kit';
import contributePrompt from '$lib/contribute-prompt.txt?raw';
import type { RequestHandler } from './$types';

// GET /contribute  (the pasted line is "<origin>/contribute uuid=xxxx")
// Content-negotiated. Agents (text/plain) get the context-free bootstrap prompt;
// browsers get a pointer. The prompt is generic and carries NO session secret: the
// agent fetches /attest/<uuid>/llms.txt for the uploadToken + projects (two-hop,
// spec §7 capability model). Canonical source: src/lib/contribute-prompt.txt.
export const GET: RequestHandler = ({ request, url }) => {
	// Point the example URLs at this deployment's origin (prod, preview, local).
	const prompt = contributePrompt.replaceAll('https://legit.build', url.origin);

	const accept = request.headers.get('accept') ?? '';
	if (accept.includes('text/html')) {
		// A human opened the page in a browser: show the actual prompt, not a stub.
		const esc = prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		return new Response(
			`<!doctype html><html lang=en><meta charset=utf-8>` +
				`<meta name=viewport content="width=device-width,initial-scale=1">` +
				`<title>legit.build /contribute</title>` +
				`<body style="font-family:system-ui,sans-serif;background:#09090b;color:#e4e4e7;max-width:48rem;margin:0 auto;padding:2.5rem 1rem;line-height:1.55">` +
				`<a href="/" style="color:#71717a;text-decoration:none;font-size:.875rem">&larr; legit.build</a>` +
				`<h1 style="font-size:1.4rem;margin:.75rem 0 .25rem">Agent prompt</h1>` +
				`<p style="color:#a1a1aa;font-size:.9rem;margin:.25rem 0 1.25rem">` +
				`This is exactly what your coding agent runs. Paste the line you were given ` +
				`(<code style="color:#34d399">${url.origin}/contribute uuid=…</code>) into your agent and it will fetch and follow this. ` +
				`See <a style="color:#34d399" href="/about">how it works</a>.</p>` +
				`<pre style="white-space:pre-wrap;overflow-wrap:anywhere;background:#18181b;border:1px solid #27272a;` +
				`border-radius:.75rem;padding:1rem 1.1rem;font-size:.8rem;line-height:1.5;` +
				`font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${esc}</pre>`,
			{ headers: { 'content-type': 'text/html; charset=utf-8' } }
		);
	}

	return text(prompt, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
