import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { attestations } from './db/schema';
import type { DecodedSubject } from '$lib/eas/schema';
import type { ArchCohort, AttestationView, HashGroup, Identity, TargetSummary } from '$lib/types';

export interface StoreParams {
	subjects: DecodedSubject[];
	identity: Identity;
	attester: string;
	source: 'eas' | 'db';
	uidPrefix: string; // EAS UID (shared by all rows in a batch) or `db:${id}`
	sessionUuid?: string;
	raw?: Record<string, unknown>;
}

/** Explode a batch attestation into one row per subject so the site groups per project (spec §9). */
export async function storeSubjects(p: StoreParams): Promise<number> {
	if (p.subjects.length === 0) return 0;
	const rows = p.subjects.map((s, i) => ({
		id: `${p.uidPrefix}#${i}`,
		source: p.source,
		project: s.project,
		version: s.version,
		osArch: s.osArch,
		sourceCommit: s.sourceCommit,
		recipeHash: s.recipeHash,
		toolchainHash: s.toolchainHash,
		artifactHash: s.artifactHash,
		identity: p.identity,
		attester: p.attester,
		raw: p.raw ?? null,
		refUid: null,
		sessionUuid: p.sessionUuid ?? null
	}));
	const res = await db
		.insert(attestations)
		.values(rows)
		.onConflictDoNothing({ target: attestations.id })
		.returning({ id: attestations.id });
	return res.length;
}

/** Attestation counts keyed by `${project}@${version}` (landing shows the latest release's count). */
export async function countByProjectVersion(): Promise<Record<string, number>> {
	const rows = await db
		.select({
			project: attestations.project,
			version: attestations.version,
			n: sql<number>`count(*)::int`
		})
		.from(attestations)
		.groupBy(attestations.project, attestations.version);
	return Object.fromEntries(rows.map((r) => [`${r.project}@${r.version}`, r.n]));
}

/**
 * Per-release, per-target attestation roll-up for a project (the release cards).
 * Returns version -> targets. positive = attestations agreeing on the dominant
 * hash in a (version, osArch) cohort; negative = attestations on any other hash.
 */
export async function getProjectAttestationSummary(
	projectId: string
): Promise<Map<string, TargetSummary[]>> {
	const rows = await db
		.select({
			version: attestations.version,
			osArch: attestations.osArch,
			artifactHash: attestations.artifactHash,
			n: sql<number>`count(*)::int`
		})
		.from(attestations)
		.where(eq(attestations.project, projectId))
		.groupBy(attestations.version, attestations.osArch, attestations.artifactHash);

	// version -> osArch -> hash -> count
	const nested = new Map<string, Map<string, Map<string, number>>>();
	for (const r of rows) {
		if (!nested.has(r.version)) nested.set(r.version, new Map());
		const byArch = nested.get(r.version)!;
		if (!byArch.has(r.osArch)) byArch.set(r.osArch, new Map());
		byArch.get(r.osArch)!.set(r.artifactHash, r.n);
	}

	const out = new Map<string, TargetSummary[]>();
	for (const [version, byArch] of nested) {
		const targets: TargetSummary[] = [];
		for (const [osArch, byHash] of byArch) {
			const counts = [...byHash.values()];
			const total = counts.reduce((a, b) => a + b, 0);
			const dominant = Math.max(...counts);
			targets.push({
				osArch,
				positive: dominant,
				negative: total - dominant,
				divergent: byHash.size > 1,
				attested: true
			});
		}
		targets.sort((a, b) => a.osArch.localeCompare(b.osArch));
		out.set(version, targets);
	}
	return out;
}

function toView(r: typeof attestations.$inferSelect): AttestationView {
	return {
		id: r.id,
		project: r.project,
		version: r.version,
		osArch: r.osArch,
		sourceCommit: r.sourceCommit,
		recipeHash: r.recipeHash,
		toolchainHash: r.toolchainHash,
		artifactHash: r.artifactHash,
		source: r.source,
		identity: r.identity,
		createdAt: r.createdAt.toISOString()
	};
}

/** Attestations for a release, matched by project + version==tag. */
export async function getReleaseAttestations(
	projectId: string,
	tag: string
): Promise<AttestationView[]> {
	const rows = await db
		.select()
		.from(attestations)
		.where(and(eq(attestations.project, projectId), eq(attestations.version, tag)))
		.orderBy(desc(attestations.createdAt));
	return rows.map(toView);
}

/**
 * Group attestations first by (osArch, recipeHash) cohort, then by artifactHash
 * within the cohort. Divergence is only meaningful within a cohort (spec §5.1.2).
 */
export function buildCohorts(views: AttestationView[]): ArchCohort[] {
	const cohorts = new Map<string, Map<string, HashGroup>>();
	for (const v of views) {
		const ck = `${v.osArch}|${v.recipeHash}`;
		if (!cohorts.has(ck)) cohorts.set(ck, new Map());
		const groups = cohorts.get(ck)!;
		if (!groups.has(v.artifactHash)) {
			groups.set(v.artifactHash, {
				artifactHash: v.artifactHash,
				count: 0,
				identities: [],
				sources: []
			});
		}
		const g = groups.get(v.artifactHash)!;
		g.count += 1;
		g.identities.push(v.identity);
		if (!g.sources.includes(v.source)) g.sources.push(v.source);
	}

	const out: ArchCohort[] = [];
	for (const [ck, groups] of cohorts) {
		const [osArch, recipeHash] = ck.split('|');
		const groupList = [...groups.values()].sort((a, b) => b.count - a.count);
		out.push({ osArch, recipeHash, groups: groupList, divergent: groupList.length > 1 });
	}
	// Cohorts with the most attestations first.
	out.sort(
		(a, b) => b.groups.reduce((s, g) => s + g.count, 0) - a.groups.reduce((s, g) => s + g.count, 0)
	);
	return out;
}
