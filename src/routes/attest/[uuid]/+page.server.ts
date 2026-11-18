import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attestations } from '$lib/server/db/schema';
import { getSession, toPublic } from '$lib/server/sessions';
import { composePost } from '$lib/server/x-proof';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const row = await getSession(params.uuid);
	if (!row) throw error(404, 'Unknown session');

	// The signed-in X user's attestation from this session, so they can (re)post it.
	let xPost = null;
	if (locals.twitter) {
		const mine = await db
			.select()
			.from(attestations)
			.where(
				and(
					eq(attestations.sessionUuid, params.uuid),
					eq(attestations.attester, `twitter:${locals.twitter.userId}`)
				)
			)
			.orderBy(attestations.id);
		if (mine.length > 0) {
			const uid = mine[0].id.slice(0, mine[0].id.lastIndexOf('#'));
			const batch = mine.filter((m) => m.id.startsWith(`${uid}#`));
			const post = await composePost(batch, locals.twitter.handle);
			const proofId = batch[0].proofTweetId;
			xPost = {
				uid,
				text: post.text,
				intentUrl: post.intentUrl,
				proofUrl: proofId ? `https://x.com/${locals.twitter.handle}/status/${proofId}` : null
			};
		}
	}

	// Never leak uploadToken here: the public view omits it (spec §7).
	return {
		session: toPublic(row),
		contributeLine: `${url.origin}/contribute uuid=${params.uuid}`,
		twitter: locals.twitter ?? null,
		github: locals.github ?? null,
		wallet: locals.wallet ?? null,
		xPost
	};
};
