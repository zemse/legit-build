import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { xFollowing } from './db/schema';
import { MAX_FOLLOWING, type FollowingPage } from './xdata';

/**
 * Sign in with GitHub (OAuth app, no scopes: public profile only) and the viewer's
 * public following list, read from the official REST API.
 */

const AUTHORIZE = 'https://github.com/login/oauth/authorize';
const TOKEN = 'https://github.com/login/oauth/access_token';
const API = 'https://api.github.com';
const FOLLOWING_TTL_MS = 24 * 3600 * 1000;
const PER_PAGE = 100;

export function authorizeUrl(state: string, redirectUri: string): string {
	const params = new URLSearchParams({
		client_id: env.GITHUB_CLIENT_ID ?? '',
		redirect_uri: redirectUri,
		scope: '',
		state,
		allow_signup: 'false'
	});
	return `${AUTHORIZE}?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
	const res = await fetch(TOKEN, {
		method: 'POST',
		headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: env.GITHUB_CLIENT_ID ?? '',
			client_secret: env.GITHUB_CLIENT_SECRET ?? '',
			code,
			redirect_uri: redirectUri
		})
	});
	const j = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
	if (!res.ok || !j.access_token)
		throw new Error(`GitHub token exchange failed: ${j.error ?? res.status}`);
	return j.access_token;
}

function headers(token?: string): Record<string, string> {
	const h: Record<string, string> = {
		accept: 'application/vnd.github+json',
		'user-agent': 'legit.build'
	};
	const t = token ?? env.GITHUB_TOKEN;
	if (t) h.authorization = `Bearer ${t}`;
	return h;
}

export interface GitHubUser {
	id: number;
	login: string;
	following: number;
}

export async function fetchMe(token: string): Promise<GitHubUser> {
	const res = await fetch(`${API}/user`, { headers: headers(token) });
	if (!res.ok) throw new Error(`GitHub /user failed: ${res.status}`);
	const j = (await res.json()) as GitHubUser;
	return { id: j.id, login: j.login, following: j.following };
}

/** Ids of accounts `login` follows, capped at MAX_FOLLOWING; pages are fetched in parallel. */
async function fetchFollowing(
	login: string,
	count: number,
	token?: string
): Promise<FollowingPage> {
	const pages = Math.max(1, Math.ceil(Math.min(count, MAX_FOLLOWING) / PER_PAGE));
	const lists = await Promise.all(
		Array.from({ length: pages }, async (_, i) => {
			const q = new URLSearchParams({ per_page: String(PER_PAGE), page: String(i + 1) });
			const res = await fetch(`${API}/users/${encodeURIComponent(login)}/following?${q}`, {
				headers: headers(token),
				signal: AbortSignal.timeout(10_000)
			});
			if (!res.ok) throw new Error(`GitHub following ${res.status}`);
			return ((await res.json()) as { id: number }[]).map((u) => String(u.id));
		})
	);
	const ids = [...new Set(lists.flat())].slice(0, MAX_FOLLOWING);
	return { ids, truncated: count > MAX_FOLLOWING };
}

// Shares the following cache with X; GitHub rows are keyed `github:<id>` so ids never collide.
const cacheKey = (userId: number | string) => `github:${userId}`;

async function store(userId: number | string, page: FollowingPage) {
	const row = { followingIds: page.ids, truncated: page.truncated, fetchedAt: new Date() };
	await db
		.insert(xFollowing)
		.values({ viewerId: cacheKey(userId), ...row })
		.onConflictDoUpdate({ target: xFollowing.viewerId, set: row });
}

/** Refresh the cache at sign-in, while we hold the user's token (its own rate limit). */
export async function primeFollowing(user: GitHubUser, token: string): Promise<void> {
	await store(user.id, await fetchFollowing(user.login, user.following, token));
}

/** Ids the viewer follows on GitHub, cached for a day; a stale cache is served on failure. */
export async function getGithubFollowingIds(viewer: {
	userId: number | null;
	login: string;
}): Promise<FollowingPage> {
	const key = cacheKey(viewer.userId ?? viewer.login);
	const [cached] = await db.select().from(xFollowing).where(eq(xFollowing.viewerId, key)).limit(1);
	if (cached && Date.now() - cached.fetchedAt.getTime() < FOLLOWING_TTL_MS) {
		return { ids: cached.followingIds, truncated: cached.truncated };
	}
	try {
		const res = await fetch(`${API}/users/${encodeURIComponent(viewer.login)}`, {
			headers: headers()
		});
		if (!res.ok) throw new Error(`GitHub user ${res.status}`);
		const u = (await res.json()) as GitHubUser;
		const page = await fetchFollowing(u.login, u.following);
		await store(viewer.userId ?? viewer.login, page);
		return page;
	} catch (e) {
		if (cached) return { ids: cached.followingIds, truncated: cached.truncated };
		throw e;
	}
}
