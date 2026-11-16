import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { xFollowing } from './db/schema';

/**
 * Public X data reads (following lists, posts). Two interchangeable providers:
 * twitterapi.io first, ScrapeBadger as the fallback when the first fails.
 */

export const MAX_FOLLOWING = 1000;
const FOLLOWING_TTL_MS = 24 * 3600 * 1000;
const TIMEOUT_MS = 10_000;

export interface XPost {
	id: string;
	authorId: string;
	authorHandle: string;
	text: string;
	createdAt: string | null;
}

export interface FollowingPage {
	ids: string[];
	truncated: boolean;
}

interface Provider {
	name: string;
	enabled(): boolean;
	following(handle: string, max: number): Promise<FollowingPage>;
	post(id: string): Promise<XPost | null>;
	search(query: string): Promise<XPost[]>;
}

async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
	const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
	return res.json();
}

type Obj = Record<string, unknown>;
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

const twitterApiIo: Provider = {
	name: 'twitterapi.io',
	enabled: () => !!env.TWITTERAPI_IO_KEY,
	async following(handle, max) {
		const h = { 'x-api-key': env.TWITTERAPI_IO_KEY ?? '' };
		const ids: string[] = [];
		let cursor = '';
		for (;;) {
			const q = new URLSearchParams({ userName: handle, pageSize: '200' });
			if (cursor) q.set('cursor', cursor);
			const d = (await getJson(`https://api.twitterapi.io/twitter/user/followings?${q}`, h)) as Obj;
			if (d.status && d.status !== 'success') throw new Error(`twitterapi.io: ${str(d.msg)}`);
			for (const u of (d.followings as Obj[] | undefined) ?? []) ids.push(str(u.id));
			if (ids.length >= max) return { ids: ids.slice(0, max), truncated: true };
			if (!d.has_next_page || !d.next_cursor) return { ids, truncated: false };
			cursor = str(d.next_cursor);
		}
	},
	async post(id) {
		const h = { 'x-api-key': env.TWITTERAPI_IO_KEY ?? '' };
		const q = new URLSearchParams({ tweet_ids: id });
		const d = (await getJson(`https://api.twitterapi.io/twitter/tweets?${q}`, h)) as Obj;
		if (d.status && d.status !== 'success') throw new Error(`twitterapi.io: ${str(d.msg)}`);
		const t = ((d.tweets as Obj[] | undefined) ?? [])[0];
		return t ? fromTwitterApiIo(t) : null;
	},
	async search(query) {
		const h = { 'x-api-key': env.TWITTERAPI_IO_KEY ?? '' };
		const q = new URLSearchParams({ query, queryType: 'Latest' });
		const d = (await getJson(
			`https://api.twitterapi.io/twitter/tweet/advanced_search?${q}`,
			h
		)) as Obj;
		return ((d.tweets as Obj[] | undefined) ?? []).map(fromTwitterApiIo);
	}
};

function fromTwitterApiIo(t: Obj): XPost {
	const a = (t.author as Obj | undefined) ?? {};
	return {
		id: str(t.id),
		authorId: str(a.id),
		authorHandle: str(a.userName),
		text: str(t.text),
		createdAt: t.createdAt ? str(t.createdAt) : null
	};
}

const scrapeBadger: Provider = {
	name: 'scrapebadger',
	enabled: () => !!env.SCRAPEBADGER_API_KEY,
	async following(handle, max) {
		const h = { 'x-api-key': env.SCRAPEBADGER_API_KEY ?? '' };
		const ids: string[] = [];
		let cursor = '';
		for (;;) {
			const q = cursor ? `?${new URLSearchParams({ cursor })}` : '';
			const d = (await getJson(
				`https://scrapebadger.com/v1/twitter/users/${encodeURIComponent(handle)}/followings${q}`,
				h
			)) as Obj;
			const page = (d.data as Obj[] | undefined) ?? [];
			for (const u of page) ids.push(str(u.id));
			if (ids.length >= max) return { ids: ids.slice(0, max), truncated: true };
			if (page.length === 0 || !d.next_cursor) return { ids, truncated: false };
			cursor = str(d.next_cursor);
		}
	},
	async post(id) {
		const h = { 'x-api-key': env.SCRAPEBADGER_API_KEY ?? '' };
		const d = (await getJson(
			`https://scrapebadger.com/v1/twitter/tweets/tweet/${encodeURIComponent(id)}`,
			h
		)) as Obj;
		const t = (d.data as Obj | undefined) ?? d;
		return t && t.id ? fromScrapeBadger(t) : null;
	},
	async search(query) {
		const h = { 'x-api-key': env.SCRAPEBADGER_API_KEY ?? '' };
		const q = new URLSearchParams({ query, query_type: 'Latest' });
		const d = (await getJson(
			`https://scrapebadger.com/v1/twitter/tweets/advanced_search?${q}`,
			h
		)) as Obj;
		return ((d.data as Obj[] | undefined) ?? []).map(fromScrapeBadger);
	}
};

function fromScrapeBadger(t: Obj): XPost {
	return {
		id: str(t.id),
		authorId: str(t.user_id),
		authorHandle: str(t.username),
		text: str(t.full_text || t.text),
		createdAt: t.created_at ? str(t.created_at) : null
	};
}

const PROVIDERS = [twitterApiIo, scrapeBadger];

/** Run `fn` against each configured provider in order until one succeeds. */
async function withFallback<T>(fn: (p: Provider) => Promise<T>): Promise<T> {
	const errors: string[] = [];
	for (const p of PROVIDERS) {
		if (!p.enabled()) continue;
		try {
			return await fn(p);
		} catch (e) {
			errors.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}
	throw new Error(errors.length ? errors.join('; ') : 'no X data provider configured');
}

export const fetchPost = (id: string) => withFallback((p) => p.post(id));
export const searchPosts = (query: string) => withFallback((p) => p.search(query));

/**
 * Ids of accounts the viewer follows, capped at MAX_FOLLOWING and cached for a day.
 * A stale cache is served if every provider fails.
 */
export async function getFollowingIds(viewer: {
	userId: string;
	handle: string;
}): Promise<FollowingPage> {
	const [cached] = await db
		.select()
		.from(xFollowing)
		.where(eq(xFollowing.viewerId, viewer.userId))
		.limit(1);
	if (cached && Date.now() - cached.fetchedAt.getTime() < FOLLOWING_TTL_MS) {
		return { ids: cached.followingIds, truncated: cached.truncated };
	}
	try {
		const page = await withFallback((p) => p.following(viewer.handle, MAX_FOLLOWING));
		const row = { followingIds: page.ids, truncated: page.truncated, fetchedAt: new Date() };
		await db
			.insert(xFollowing)
			.values({ viewerId: viewer.userId, ...row })
			.onConflictDoUpdate({ target: xFollowing.viewerId, set: row });
		return page;
	} catch (e) {
		if (cached) return { ids: cached.followingIds, truncated: cached.truncated };
		throw e;
	}
}

/** Pull the numeric post id out of an x.com / twitter.com status URL, or a bare id. */
export function parsePostId(input: string): string | null {
	const s = input.trim();
	if (/^\d{5,25}$/.test(s)) return s;
	const m = s.match(/(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d{5,25})/i);
	return m ? m[1] : null;
}
