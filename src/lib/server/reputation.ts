import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { identityCache } from './db/schema';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const ETH_RPC = env.ETH_RPC_URL ?? 'https://eth.llamarpc.com';

export interface ResolvedIdentity {
	address: string;
	ens: string | null;
	fid: number | null;
	fidFollowers: number | null;
	accountAgeDays: number | null;
}

async function resolveEns(address: string): Promise<string | null> {
	try {
		const provider = new ethers.JsonRpcProvider(ETH_RPC);
		return await provider.lookupAddress(address);
	} catch {
		return null;
	}
}

interface NeynarUser {
	fid: number;
	follower_count: number;
}

async function resolveFarcaster(
	address: string
): Promise<{ fid: number | null; fidFollowers: number | null }> {
	if (!env.NEYNAR_API_KEY) return { fid: null, fidFollowers: null };
	try {
		const res = await fetch(
			`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
			{ headers: { 'x-api-key': env.NEYNAR_API_KEY, accept: 'application/json' } }
		);
		if (!res.ok) return { fid: null, fidFollowers: null };
		const json = (await res.json()) as Record<string, NeynarUser[]>;
		const users = json[address.toLowerCase()];
		if (!users?.length) return { fid: null, fidFollowers: null };
		// Pick the highest-follower verified account for this address.
		const best = users.reduce((a, b) => (b.follower_count > a.follower_count ? b : a));
		return { fid: best.fid, fidFollowers: best.follower_count };
	} catch {
		return { fid: null, fidFollowers: null };
	}
}

/** Resolve + cache identity signals for a wallet address (spec §10 reputation). */
export async function resolveIdentity(addressRaw: string): Promise<ResolvedIdentity> {
	const address = addressRaw.toLowerCase();
	const [cached] = await db
		.select()
		.from(identityCache)
		.where(eq(identityCache.address, address))
		.limit(1);
	if (cached && Date.now() - cached.refreshedAt.getTime() < CACHE_TTL_MS) {
		return {
			address,
			ens: cached.ens,
			fid: cached.fid,
			fidFollowers: cached.fidFollowers,
			accountAgeDays: cached.accountAgeDays
		};
	}

	const [ens, fc] = await Promise.all([resolveEns(address), resolveFarcaster(address)]);
	const row = {
		address,
		ens,
		fid: fc.fid,
		fidFollowers: fc.fidFollowers,
		accountAgeDays: null as number | null,
		refreshedAt: new Date()
	};
	await db.insert(identityCache).values(row).onConflictDoUpdate({ target: identityCache.address, set: row });
	return row;
}

/**
 * Corroboration weight for ranking (spec §10). A Sybil floor: an identity
 * only counts once it clears a minimum follower / verification bar.
 */
export function corroborationWeight(id: ResolvedIdentity): number {
	let w = 0;
	if (id.ens) w += 1;
	if (id.fid) w += 1;
	if ((id.fidFollowers ?? 0) >= 50) w += 1;
	if ((id.fidFollowers ?? 0) >= 500) w += 1;
	return w;
}

export const SYBIL_FLOOR = 1; // must clear this before an identity counts
