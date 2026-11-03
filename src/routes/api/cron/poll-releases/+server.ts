import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { projects, releases } from '$lib/server/db/schema';
import { pollReleases } from '$lib/server/forge';
import { expireStale } from '$lib/server/sessions';
import type { RequestHandler } from './$types';

// GET /api/cron/poll-releases  (Vercel Cron sends Authorization: Bearer $CRON_SECRET)
export const GET: RequestHandler = async ({ request }) => {
	if (env.CRON_SECRET) {
		const auth = request.headers.get('authorization');
		if (auth !== `Bearer ${env.CRON_SECRET}`) {
			return new Response('unauthorized', { status: 401 });
		}
	}

	const all = await db.select().from(projects);
	const summary: Record<string, number> = {};
	const errors: Record<string, string> = {};

	for (const p of all) {
		try {
			const polled = await pollReleases({ forge: p.forge, owner: p.owner, repo: p.repo });
			if (polled.length === 0) continue;
			const rows = polled.map((r) => ({
				id: `${p.id}@${r.tag}`,
				projectId: p.id,
				tag: r.tag,
				commit: r.commit,
				name: r.name,
				url: r.url,
				prerelease: r.prerelease,
				platforms: r.platforms,
				publishedAt: r.publishedAt ? new Date(r.publishedAt) : null
			}));
			await db
				.insert(releases)
				.values(rows)
				.onConflictDoUpdate({
					target: releases.id,
					set: {
						commit: sql`excluded.commit`,
						platforms: sql`excluded.platforms`,
						name: sql`excluded.name`,
						url: sql`excluded.url`
					}
				});
			summary[p.id] = rows.length;
		} catch (e) {
			errors[p.id] = e instanceof Error ? e.message : String(e);
		}
	}

	const expired = await expireStale();
	return json({ ok: true, polled: summary, expiredSessions: expired, errors });
};
