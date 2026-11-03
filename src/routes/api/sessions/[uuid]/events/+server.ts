import { error } from '@sveltejs/kit';
import { getSession, toPublic } from '$lib/server/sessions';
import type { RequestHandler } from './$types';

const POLL_MS = 1000;
const MAX_MS = 55_000; // stay under serverless function ceiling; browser reconnects

// GET /api/sessions/:uuid/events (SSE). Source of truth is the DB; this is a
// notification layer that polls for seq changes and re-emits (spec §7, §5.2 note).
export const GET: RequestHandler = async ({ params, request }) => {
	const first = await getSession(params.uuid);
	if (!first) throw error(404, 'Unknown session');

	const resumeFrom = Number(request.headers.get('last-event-id') ?? '0') || 0;

	const stream = new ReadableStream({
		async start(controller) {
			const enc = new TextEncoder();
			const send = (event: string, data: unknown, id?: number) => {
				let chunk = '';
				if (id !== undefined) chunk += `id: ${id}\n`;
				chunk += `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(enc.encode(chunk));
			};

			let lastSeq = resumeFrom;
			let sentResults = 0;
			const started = Date.now();
			let closed = false;
			request.signal.addEventListener('abort', () => (closed = true));

			// Initial snapshot so a fresh or reconnecting browser is immediately in sync.
			const snap = toPublic(first);
			if (resumeFrom === 0) {
				send('state', snap, first.seq);
				for (const r of snap.results) send('result', r);
				sentResults = snap.results.length;
				lastSeq = first.seq;
			} else {
				sentResults = snap.results.length;
			}

			while (!closed && Date.now() - started < MAX_MS) {
				const row = await getSession(params.uuid);
				if (!row) {
					send('state', { state: 'expired' });
					break;
				}
				if (row.seq !== lastSeq) {
					const pub = toPublic(row);
					for (let i = sentResults; i < pub.results.length; i++) send('result', pub.results[i]);
					sentResults = pub.results.length;
					send('state', pub, row.seq);
					lastSeq = row.seq;
					if (row.state === 'attested' || row.state === 'expired') break;
				} else {
					controller.enqueue(enc.encode(': ping\n\n')); // heartbeat
				}
				await new Promise((r) => setTimeout(r, POLL_MS));
			}
			controller.close();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			connection: 'keep-alive'
		}
	});
};
