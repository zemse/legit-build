import { error, json } from '@sveltejs/kit';
import { like } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attestations } from '$lib/server/db/schema';
import { fetchPost, parsePostId, searchPosts, type XPost } from '$lib/server/xdata';
import { composePost, getBatch, postProves } from '$lib/server/x-proof';
import type { RequestHandler } from './$types';

// POST /api/attest/twitter/proof {uid, url?}
// Links the attester's public X post to their attestation batch. With no url we
// look for a recent post of theirs that carries the batch's hashes.
export const POST: RequestHandler = async ({ request, locals }) => {
	const twitter = locals.twitter;
	if (!twitter) throw error(401, 'not signed in with X');

	const body = (await request.json().catch(() => null)) as { uid?: string; url?: string } | null;
	if (!body?.uid) throw error(400, 'uid required');

	const rows = await getBatch(body.uid);
	if (rows.length === 0) throw error(404, 'Unknown attestation');
	const attester = `twitter:${twitter.userId}`;
	if (rows.some((r) => r.attester !== attester)) throw error(403, 'Not your attestation');

	const { hashes } = await composePost(rows, twitter.handle);

	let post: XPost | null = null;
	try {
		if (body.url) {
			const id = parsePostId(body.url);
			if (!id) throw error(400, 'Paste the link to your post on X');
			post = await fetchPost(id);
		} else {
			const found = await searchPosts(`from:${twitter.handle} ${hashes[0]}`);
			post = found.find((p) => postProves(p, twitter.userId, hashes)) ?? null;
		}
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		throw error(502, 'Could not reach X right now, try again in a minute');
	}

	if (!post)
		throw error(404, 'Post not found yet. It can take a minute to show up, or paste its link');
	if (!postProves(post, twitter.userId, hashes)) {
		throw error(422, 'That post is not from your account or is missing the attested hashes');
	}

	await db
		.update(attestations)
		.set({ proofTweetId: post.id })
		.where(like(attestations.id, `${body.uid.replace(/[%_]/g, '\\$&')}#%`));

	return json({
		ok: true,
		postId: post.id,
		url: `https://x.com/${twitter.handle}/status/${post.id}`
	});
};
