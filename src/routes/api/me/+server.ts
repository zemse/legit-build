import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/me: the signed-in identity, fetched client-side so cached pages stay public.
export const GET: RequestHandler = ({ locals, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	return json({ twitter: locals.twitter ?? null, wallet: locals.wallet ?? null });
};
