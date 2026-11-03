import { randomBytes, randomUUID } from 'node:crypto';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { db } from './db';
import { sessions } from './db/schema';
import type { BuildResult, SessionPublic, SessionState } from '$lib/types';

const DEFAULT_TTL = 72 * 3600; // 72h of inactivity; extended on each result (spec §7)
export const MAX_PROJECTS = 20;
export const MAX_RESULT_BYTES = 16 * 1024;

export interface CreatedSession {
	uuid: string;
	uploadToken: string;
}

export async function createSession(
	projectIds: string[],
	instructions: string | null
): Promise<CreatedSession> {
	const uuid = randomUUID();
	const uploadToken = randomBytes(24).toString('base64url');
	const expiresAt = new Date(Date.now() + DEFAULT_TTL * 1000);
	await db.insert(sessions).values({
		uuid,
		uploadToken,
		projects: projectIds,
		instructions,
		state: 'created',
		expiresAt,
		ttl: DEFAULT_TTL
	});
	return { uuid, uploadToken };
}

export async function getSession(uuid: string) {
	const [row] = await db.select().from(sessions).where(eq(sessions.uuid, uuid)).limit(1);
	return row ?? null;
}

/** Public view: never leaks uploadToken (spec §7 capability model). */
export function toPublic(row: NonNullable<Awaited<ReturnType<typeof getSession>>>): SessionPublic {
	return {
		uuid: row.uuid,
		projects: row.projects,
		instructions: row.instructions,
		state: row.state,
		results: row.results,
		createdAt: row.createdAt.toISOString(),
		ttl: row.ttl
	};
}

function isExpired(row: { expiresAt: Date; state: SessionState }) {
	return row.state !== 'attested' && row.expiresAt.getTime() < Date.now();
}

/** Append one agent result. Validates ownership via uploadToken at the route. */
export async function appendResult(uuid: string, result: BuildResult): Promise<number | null> {
	const row = await getSession(uuid);
	if (!row || isExpired(row)) return null;
	const results = [...row.results, result];
	const seq = row.seq + 1;
	// First result flips created -> building; extend TTL while a build is active.
	const state: SessionState = row.state === 'created' ? 'building' : row.state;
	const expiresAt = new Date(Date.now() + row.ttl * 1000);
	await db
		.update(sessions)
		.set({ results, seq, state, updatedAt: new Date(), expiresAt })
		.where(eq(sessions.uuid, uuid));
	return seq;
}

export async function completeSession(uuid: string): Promise<boolean> {
	const row = await getSession(uuid);
	if (!row || isExpired(row)) return false;
	await db
		.update(sessions)
		.set({ state: 'results_ready', seq: row.seq + 1, updatedAt: new Date() })
		.where(eq(sessions.uuid, uuid));
	return true;
}

export async function markAttested(uuid: string): Promise<void> {
	await db
		.update(sessions)
		.set({ state: 'attested', updatedAt: new Date() })
		.where(eq(sessions.uuid, uuid));
}

/** Lazily mark building sessions as building on first agent fetch (spec §7 state machine). */
export async function touchBuilding(uuid: string): Promise<void> {
	await db
		.update(sessions)
		.set({ state: 'building', updatedAt: new Date() })
		.where(and(eq(sessions.uuid, uuid), eq(sessions.state, 'created')));
}

/** Sweep expired, non-terminal sessions (called opportunistically by the cron). */
export async function expireStale(): Promise<number> {
	const res = await db
		.update(sessions)
		.set({ state: 'expired' })
		.where(
			and(lt(sessions.expiresAt, new Date()), inArray(sessions.state, ['created', 'building']))
		)
		.returning({ uuid: sessions.uuid });
	return res.length;
}
