import { relations, sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import type { AttestationSource, BuildResult, Identity, SessionState } from '../../types';

/**
 * Projects we track. Identity is forge-qualified so the same model supports any
 * repo on any forge (spec §4): id = `<forge>/<owner>/<repo>`, e.g.
 * `github/ethereum/go-ethereum` or `gitlab/group/subgroup/repo`.
 */
export const projects = pgTable('projects', {
	id: text('id').primaryKey(), // `${forge}/${owner}/${repo}`
	forge: text('forge').notNull(), // 'github' | 'gitlab'
	owner: text('owner').notNull(), // may contain slashes (gitlab subgroups)
	repo: text('repo').notNull(),
	name: text('name'), // display name; defaults to repo
	layer: text('layer'), // optional tag, e.g. execution | consensus
	lang: text('lang'), // optional
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/** Versions: releases polled from the project's forge on a cron (spec §4, §15.2). */
export const releases = pgTable(
	'releases',
	{
		id: text('id').primaryKey(), // `${projectId}@${tag}`
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		tag: text('tag').notNull(),
		commit: text('commit'), // resolved tag -> commit sha
		name: text('name'),
		url: text('url'),
		prerelease: boolean('prerelease').notNull().default(false),
		platforms: jsonb('platforms')
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('releases_project_idx').on(t.projectId),
		index('releases_published_idx').on(t.publishedAt)
	]
);

/** Contribution sessions: the agent relay handoff (spec §4, §5.2, §7). */
export const sessions = pgTable(
	'sessions',
	{
		uuid: text('uuid').primaryKey(),
		// uploadToken is NEVER returned in a uuid-fetchable body (spec §7 OPEN note).
		uploadToken: text('upload_token').notNull(),
		projects: jsonb('projects').$type<string[]>().notNull(), // selected project ids
		instructions: text('instructions'),
		state: text('state').$type<SessionState>().notNull().default('created'),
		results: jsonb('results')
			.$type<BuildResult[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		// Monotonic cursor so SSE can resume via Last-Event-ID.
		seq: integer('seq').notNull().default(0),
		ttl: integer('ttl').notNull().default(7200), // seconds
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
	},
	(t) => [index('sessions_state_idx').on(t.state), index('sessions_expires_idx').on(t.expiresAt)]
);

/**
 * Attestations: our index of both DB-issued (twitter, issuer key) and wallet EAS
 * off-chain attestations we created or merged from easscan (spec §4, §10). A batch
 * attestation is exploded into one row per subject so the site groups per project.
 */
export const attestations = pgTable(
	'attestations',
	{
		id: text('id').primaryKey(), // EAS off-chain UID + index, or `db:${id}#i`
		source: text('source').$type<AttestationSource>().notNull(),

		// Subject (spec §4). `project` is the forge-qualified project id.
		project: text('project').notNull(),
		version: text('version').notNull(),
		osArch: text('os_arch').notNull(), // the target
		sourceCommit: text('source_commit').notNull(),
		recipeHash: text('recipe_hash').notNull(),
		toolchainHash: text('toolchain_hash').notNull(),
		artifactHash: text('artifact_hash').notNull(),

		// Identity (spec §4).
		identity: jsonb('identity').$type<Identity>().notNull(),
		attester: text('attester').notNull(), // wallet address or `twitter:${userId}`

		raw: jsonb('raw').$type<Record<string, unknown>>(),
		refUid: text('ref_uid'),
		sessionUuid: text('session_uuid'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		// Dedupe on merge: one attester attests one subject+hash once (spec §10).
		uniqueIndex('attestations_dedupe_idx').on(
			t.attester,
			t.project,
			t.version,
			t.osArch,
			t.sourceCommit,
			t.artifactHash
		),
		index('attestations_subject_idx').on(t.project, t.version, t.osArch),
		index('attestations_artifact_idx').on(t.artifactHash)
	]
);

/** Identity reputation cache so we don't hammer Neynar per request (spec §10). */
export const identityCache = pgTable('identity_cache', {
	address: text('address').primaryKey(), // lowercased wallet address
	ens: text('ens'),
	fid: integer('fid'),
	fidFollowers: bigint('fid_followers', { mode: 'number' }),
	accountAgeDays: integer('account_age_days'),
	refreshedAt: timestamp('refreshed_at', { withTimezone: true }).notNull().defaultNow()
});

export const releasesRelations = relations(releases, ({ one }) => ({
	project: one(projects, { fields: [releases.projectId], references: [projects.id] })
}));

export const projectsRelations = relations(projects, ({ many }) => ({
	releases: many(releases)
}));

export type Project = typeof projects.$inferSelect;
export type Release = typeof releases.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Attestation = typeof attestations.$inferSelect;
