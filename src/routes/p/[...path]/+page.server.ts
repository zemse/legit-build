import { and, desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects, releases } from '$lib/server/db/schema';
import {
	buildCohorts,
	getProjectAttestationSummary,
	getReleaseAttestations
} from '$lib/server/attestations';
import { resolveCommit } from '$lib/server/forge';
import type { ReleaseCard } from '$lib/types';
import type { PageServerLoad } from './$types';

// Single rest route for a project and its releases. The project id is forge-
// qualified (`github/owner/repo`, possibly deeper); a release path appends
// `/releases/<tag>`. We split on that literal marker so slashes need no encoding.
export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=30' });

	const full = params.path;
	const marker = '/releases/';
	const idx = full.indexOf(marker);
	const projectId = idx >= 0 ? full.slice(0, idx) : full;
	const tag = idx >= 0 ? decodeURIComponent(full.slice(idx + marker.length)) : null;

	const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
	if (!project) throw error(404, 'Unknown project');

	if (tag === null) {
		// Project view: release cards with per-target positive/negative attestation counts.
		const [rels, summary] = await Promise.all([
			db
				.select()
				.from(releases)
				.where(eq(releases.projectId, projectId))
				.orderBy(desc(releases.publishedAt)),
			getProjectAttestationSummary(projectId)
		]);

		const cards: ReleaseCard[] = rels.map((r) => {
			const attested = summary.get(r.tag) ?? [];
			const attestedArch = new Set(attested.map((t) => t.osArch));
			// Targets the release ships but nobody has attested yet.
			const declared = (r.platforms ?? [])
				.filter((a) => !attestedArch.has(a))
				.map((a) => ({ osArch: a, positive: 0, negative: 0, divergent: false, attested: false }));
			const targets = [...attested, ...declared].sort((a, b) => a.osArch.localeCompare(b.osArch));
			const totalAttestations = attested.reduce((s, t) => s + t.positive + t.negative, 0);
			return {
				tag: r.tag,
				publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
				prerelease: r.prerelease,
				url: r.url,
				targets,
				totalAttestations
			};
		});

		return { view: 'project' as const, project, cards };
	}

	// Release view: the cohort detail (hashes + identities) for one version.
	let [release] = await db
		.select()
		.from(releases)
		.where(and(eq(releases.projectId, projectId), eq(releases.tag, tag)))
		.limit(1);

	// Resolve the tag -> commit lazily on first view and cache it (keeps the cron cheap).
	if (release && !release.commit) {
		const commit = await resolveCommit(
			{ forge: project.forge, owner: project.owner, repo: project.repo },
			tag
		);
		if (commit) {
			await db.update(releases).set({ commit }).where(eq(releases.id, release.id));
			release = { ...release, commit };
		}
	}

	const views = await getReleaseAttestations(projectId, tag);
	const cohorts = buildCohorts(views);
	const distinctIdentities = new Set(
		views.map((v) =>
			v.identity.kind === 'wallet'
				? v.identity.address
				: v.identity.kind === 'github'
					? `github:${v.identity.userId ?? v.identity.login}`
					: v.identity.handle
		)
	).size;

	return {
		view: 'release' as const,
		project,
		release: release ?? { tag, commit: null, publishedAt: null, url: null, prerelease: false },
		cohorts,
		total: views.length,
		distinctIdentities,
		anyDivergent: cohorts.some((c) => c.divergent)
	};
};
