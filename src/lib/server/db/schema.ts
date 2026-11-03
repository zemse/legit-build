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
import type { BuildResult, Identity, SessionState } from '../../types';

/** Ethereum clients we track (spec §4: ~13 from the build audit). */
export const clients = pgTable('clients', {
	id: text('id').primaryKey(), // slug, e.g. "reth"
	name: text('name').notNull(),
	repo: text('repo').notNull(), // "owner/name" on GitHub
	layer: text('layer').notNull(), // "execution" | "consensus"
	lang: text('lang'), // primary language, informational
	releaseSource: text('release_source').notNull().default('github'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/** Releases, polled from GitHub Releases on a cron (spec §4, §15.2). */
export const releases = pgTable(
	'releases',
	{
		id: text('id').primaryKey(), // `${clientId}@${tag}`
		clientId: text('client_id')
			.notNull()
			.references(() => clients.id, { onDelete: 'cascade' }),
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
		index('releases_client_idx').on(t.clientId),
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
		clients: jsonb('clients').$type<string[]>().notNull(),
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
 * Attestations: our index of both DB-issued (twitter, issuer key) and
 * wallet EAS off-chain attestations we created or merged from easscan (spec §4, §10).
 */
export const attestations = pgTable(
	'attestations',
	{
		id: text('id').primaryKey(), // EAS off-chain UID, or `db:${nanoid}`
		source: text('source').$type<'eas' | 'db'>().notNull(),

		// Subject (spec §4). For batched off-chain attestations each decoded
		// array element is stored as its own row so the site can group per client.
		client: text('client').notNull(),
		version: text('version').notNull(),
		osArch: text('os_arch').notNull(),
		sourceCommit: text('source_commit').notNull(),
		recipeHash: text('recipe_hash').notNull(),
		toolchainHash: text('toolchain_hash').notNull(),
		artifactHash: text('artifact_hash').notNull(),

		// Identity (spec §4).
		identity: jsonb('identity').$type<Identity>().notNull(),
		attester: text('attester').notNull(), // wallet address or `twitter:${userId}`

		// Provenance: the signed off-chain blob / EAS UID bundle, for re-verification.
		raw: jsonb('raw').$type<Record<string, unknown>>(),
		refUid: text('ref_uid'), // release schema ref, if used (v2 on-chain)
		sessionUuid: text('session_uuid'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		// Dedupe on merge: one attester attests one subject+hash once (spec §10).
		uniqueIndex('attestations_dedupe_idx').on(
			t.attester,
			t.client,
			t.version,
			t.osArch,
			t.sourceCommit,
			t.artifactHash
		),
		index('attestations_subject_idx').on(t.client, t.version, t.osArch),
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
	client: one(clients, { fields: [releases.clientId], references: [clients.id] })
}));

export const clientsRelations = relations(clients, ({ many }) => ({
	releases: many(releases)
}));

export type Client = typeof clients.$inferSelect;
export type Release = typeof releases.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Attestation = typeof attestations.$inferSelect;
