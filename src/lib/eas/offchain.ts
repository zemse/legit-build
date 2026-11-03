// Browser-only: connect an injected wallet, SIWE sign-in, and sign ONE EAS
// off-chain attestation over the whole approved batch (spec §5.3, single signature).
import { EAS, type SignedOffchainAttestation } from '@ethereum-attestation-service/eas-sdk';
import { BrowserProvider, type Signer } from 'ethers';
import { EAS_CHAIN_ID, EAS_CONTRACT, EAS_SCHEMA_UID } from './config';
import { encodeBatch } from './schema';
import type { BuildResult } from '$lib/types';

function provider(): BrowserProvider {
	if (!window.ethereum) throw new Error('No wallet found. Install a browser wallet.');
	return new BrowserProvider(window.ethereum);
}

async function ensureChain(): Promise<void> {
	const hex = '0x' + EAS_CHAIN_ID.toString(16);
	try {
		await window.ethereum!.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: hex }]
		});
	} catch {
		// Chain may not be added; let the signing call surface the real error.
	}
}

export async function connectWallet(): Promise<{ signer: Signer; address: string }> {
	const p = provider();
	await p.send('eth_requestAccounts', []);
	await ensureChain();
	const signer = await p.getSigner();
	return { signer, address: (await signer.getAddress()).toLowerCase() };
}

/** SIWE: fetch nonce, sign an EIP-4361 message, establish the session cookie. */
export async function siweSignIn(signer: Signer, address: string): Promise<void> {
	const nonce = await fetch('/auth/siwe/nonce').then((r) => r.text());
	const domain = window.location.host;
	const message = [
		`${domain} wants you to sign in with your Ethereum account:`,
		address,
		'',
		'Sign in to legit.build to attest client builds.',
		'',
		`URI: ${window.location.origin}`,
		'Version: 1',
		`Chain ID: ${EAS_CHAIN_ID}`,
		`Nonce: ${nonce}`,
		`Issued At: ${new Date().toISOString()}`
	].join('\n');
	const signature = await signer.signMessage(message);
	const res = await fetch('/auth/siwe/verify', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ message, signature })
	});
	if (!res.ok) throw new Error('SIWE verification failed');
}

/** Convert a signed attestation (with bigint fields) into a JSON-safe object. */
function toJsonSafe(signed: SignedOffchainAttestation): Record<string, unknown> {
	return JSON.parse(JSON.stringify(signed, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function signBatch(
	signer: Signer,
	results: BuildResult[]
): Promise<{ signed: Record<string, unknown>; signer: string }> {
	if (!EAS_SCHEMA_UID) throw new Error('EAS schema UID not configured (PUBLIC_EAS_SCHEMA_UID)');
	const eas = new EAS(EAS_CONTRACT);
	eas.connect(signer as unknown as Parameters<typeof eas.connect>[0]);
	const offchain = await eas.getOffchain();
	const signed = await offchain.signOffchainAttestation(
		{
			recipient: '0x0000000000000000000000000000000000000000',
			expirationTime: 0n,
			time: BigInt(Math.floor(Date.now() / 1000)),
			revocable: true,
			schema: EAS_SCHEMA_UID,
			refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
			data: encodeBatch(results)
		},
		signer
	);
	return { signed: toJsonSafe(signed), signer: (await signer.getAddress()).toLowerCase() };
}
