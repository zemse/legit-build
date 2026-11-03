import { error } from '@sveltejs/kit';
import { getSession, toPublic } from '$lib/server/sessions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const row = await getSession(params.uuid);
	if (!row) throw error(404, 'Unknown session');
	// Never leak uploadToken here: the public view omits it (spec §7).
	return {
		session: toPublic(row),
		contributeLine: `${url.origin}/contribute uuid=${params.uuid}`,
		twitter: locals.twitter ?? null,
		wallet: locals.wallet ?? null
	};
};
