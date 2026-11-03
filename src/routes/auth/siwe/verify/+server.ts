import { error, json } from '@sveltejs/kit';
import { ethers } from 'ethers';
import { setIdentity } from '$lib/server/auth';
import { resolveIdentity } from '$lib/server/reputation';
import type { WalletIdentity } from '$lib/types';
import type { RequestHandler } from './$types';

// POST /auth/siwe/verify {message, signature}
// Recovers the signer, checks the issued nonce appears in the message, sets the wallet identity.
export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = (await request.json().catch(() => null)) as {
		message?: string;
		signature?: string;
	} | null;
	if (!body?.message || !body.signature) throw error(400, 'message + signature required');

	const nonce = cookies.get('siwe_nonce');
	if (!nonce || !body.message.includes(nonce)) throw error(400, 'bad or missing nonce');

	let signer: string;
	try {
		signer = ethers.verifyMessage(body.message, body.signature).toLowerCase();
	} catch {
		throw error(400, 'bad signature');
	}
	cookies.delete('siwe_nonce', { path: '/' });

	const resolved = await resolveIdentity(signer);
	const identity: WalletIdentity = {
		kind: 'wallet',
		address: signer,
		ens: resolved.ens,
		fid: resolved.fid
	};
	setIdentity(cookies, identity);
	return json({ ok: true, identity });
};
