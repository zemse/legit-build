import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /contribute  (the pasted line is "<origin>/contribute uuid=xxxx")
// Content-negotiated. Agents (text/plain) get the bootstrap prompt; browsers get a pointer.
// NOTE: the prompt body is a PLACEHOLDER — the final wording is WIP in another workstream.
export const GET: RequestHandler = ({ request, url }) => {
	const accept = request.headers.get('accept') ?? '';
	if (accept.includes('text/html')) {
		return new Response(
			`<!doctype html><meta charset=utf-8><title>legit.build /contribute</title>` +
				`<body style="font-family:system-ui;background:#09090b;color:#e4e4e7;max-width:40rem;margin:4rem auto;padding:0 1rem">` +
				`<h1>legit.build — agent entrypoint</h1>` +
				`<p>This URL is meant to be fetched by your coding agent together with a <code>uuid</code> ` +
				`from the line you copied. See <a style="color:#34d399" href="/about">how it works</a>.</p>`,
			{ headers: { 'content-type': 'text/html; charset=utf-8' } }
		);
	}

	const prompt = `# legit.build — contribution bootstrap (PLACEHOLDER, WIP)

You were given a line like:

    ${url.origin}/contribute uuid=<UUID>

Take the UUID from that line and fetch the session-scoped instructions:

    GET ${url.origin}/attest/<UUID>/llms.txt

Follow those instructions exactly: build only the pinned recipe for each listed client,
then POST each result and finally POST /complete using the upload token given there.
Report your own os/arch; the site compares builds per architecture.

(The final version of this prompt is being derived by actually building the clients.)
`;
	return text(prompt, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
