import { error, json } from '@sveltejs/kit';
import { storeSubjects } from '$lib/server/attestations';
import { reviveSigned, verifyOffchain } from '$lib/server/eas';
import { markAttested } from '$lib/server/sessions';
import { resolveIdentity } from '$lib/server/reputation';
import { decodeBatch } from '$lib/eas/schema';
import type { WalletIdentity } from '$lib/types';
import type { RequestHandler } from './$types';

// POST /api/attestations {signed, signer, sessionUuid?}
// Wallet off-chain path (spec §5.3): verify signature, decode the batch, store per subject.
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as {
		signed?: Record<string, unknown>;
		signer?: string;
		sessionUuid?: string;
	} | null;
	if (!body?.signed || !body.signer) throw error(400, 'signed + signer required');

	const signed = reviveSigned(body.signed);
	const signer = body.signer.toLowerCase();

	// Recover + check the signature was made by the claimed signer.
	const ok = await verifyOffchain(signer, signed);
	if (!ok) throw error(400, 'invalid off-chain signature');

	const subjects = decodeBatch(signed.message.data);
	if (subjects.length === 0) throw error(400, 'empty attestation');

	const resolved = await resolveIdentity(signer);
	const identity: WalletIdentity = {
		kind: 'wallet',
		address: signer,
		ens: resolved.ens,
		fid: resolved.fid
	};

	const stored = await storeSubjects({
		subjects,
		identity,
		attester: signer,
		source: 'eas',
		uidPrefix: signed.uid,
		sessionUuid: body.sessionUuid,
		raw: signed as unknown as Record<string, unknown>
	});

	if (body.sessionUuid) await markAttested(body.sessionUuid);
	return json({ ok: true, stored, uid: signed.uid });
};
