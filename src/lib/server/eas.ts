import { EAS, type SignedOffchainAttestation } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';
import { env } from '$env/dynamic/private';
import { EAS_CONTRACT, EAS_SCHEMA_UID, EASSCAN_GRAPHQL } from '$lib/eas/config';
import { decodeBatch, encodeBatch, type DecodedSubject } from '$lib/eas/schema';
import type { BuildResult } from '$lib/types';

const RPC = env.EAS_RPC_URL ?? 'https://sepolia.base.org';

/**
 * Twitter trusted-issuer path (spec §5.3). The backend signs ONE off-chain
 * attestation with the issuer key over the full approved batch and records the
 * X handle as the identity. Coinbase trusted-issuer model from [09].
 */
export async function signIssuerAttestation(
	results: BuildResult[]
): Promise<{ uid: string; signed: SignedOffchainAttestation; attester: string }> {
	const pk = env.EAS_ISSUER_PRIVATE_KEY;
	if (!pk) throw new Error('EAS_ISSUER_PRIVATE_KEY is not set');
	if (!EAS_SCHEMA_UID) throw new Error('PUBLIC_EAS_SCHEMA_UID is not set');

	const provider = new ethers.JsonRpcProvider(RPC);
	const signer = new ethers.Wallet(pk, provider);
	const eas = new EAS(EAS_CONTRACT);
	eas.connect(signer);

	const offchain = await eas.getOffchain();
	const signed = await offchain.signOffchainAttestation(
		{
			recipient: ethers.ZeroAddress,
			expirationTime: 0n,
			time: BigInt(Math.floor(Date.now() / 1000)),
			revocable: true,
			schema: EAS_SCHEMA_UID,
			refUID: ethers.ZeroHash,
			data: encodeBatch(results)
		},
		signer
	);

	return { uid: signed.uid, signed, attester: await signer.getAddress() };
}

/**
 * Revive a JSON-transported signed attestation: the client stringifies bigint
 * fields, so convert the numeric message fields back to BigInt before verifying.
 */
export function reviveSigned(obj: Record<string, unknown>): SignedOffchainAttestation {
	const o = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
	const msg = o.message as Record<string, unknown> | undefined;
	if (msg) {
		for (const k of ['expirationTime', 'time', 'nonce']) {
			if (msg[k] !== undefined && msg[k] !== null) msg[k] = BigInt(msg[k] as string);
		}
	}
	return o as unknown as SignedOffchainAttestation;
}

/** Verify a wallet-signed off-chain attestation (spec §5.3: API verifies signature). */
export async function verifyOffchain(signed: SignedOffchainAttestation): Promise<boolean> {
	try {
		const provider = new ethers.JsonRpcProvider(RPC);
		const eas = new EAS(EAS_CONTRACT);
		eas.connect(provider);
		const offchain = await eas.getOffchain();
		// Recovered signer must equal the claimed attester in signed.message.
		return offchain.verifyOffchainAttestationSignature(signed.signer, signed);
	} catch {
		return false;
	}
}

interface EasscanAttestation {
	id: string;
	attester: string;
	time: number;
	data: string;
	revoked: boolean;
}

/**
 * Query easscan for attestations on our schema made OUTSIDE the site (spec §10),
 * to union + dedupe with our DB index. Returns decoded per-index subjects with
 * their attester + UID so the caller can upsert.
 */
export async function fetchEasscanAttestations(): Promise<
	Array<{ uid: string; attester: string; time: number; subjects: DecodedSubject[] }>
> {
	if (!EAS_SCHEMA_UID) return [];
	const query = `
		query Attestations($schemaId: String!) {
			attestations(
				where: { schemaId: { equals: $schemaId }, revoked: { equals: false } }
				orderBy: { time: desc }
				take: 200
			) { id attester time data revoked }
		}`;
	const res = await fetch(EASSCAN_GRAPHQL, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query, variables: { schemaId: EAS_SCHEMA_UID } })
	});
	if (!res.ok) throw new Error(`easscan GraphQL: ${res.status}`);
	const json = (await res.json()) as { data?: { attestations: EasscanAttestation[] } };
	const rows = json.data?.attestations ?? [];
	return rows.map((a) => {
		let subjects: DecodedSubject[] = [];
		try {
			subjects = decodeBatch(a.data);
		} catch {
			subjects = [];
		}
		return { uid: a.id, attester: a.attester, time: a.time, subjects };
	});
}
