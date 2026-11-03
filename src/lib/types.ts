// Core domain types. Mirrors spec §4 (core objects) and §8 (result shape).

export type OsArch = string; // e.g. "linux/amd64", "linux/arm64", "darwin/arm64"

/** The result an agent POSTs per built client (spec §8). */
export interface BuildResult {
	client: string;
	version: string;
	tag: string;
	sourceCommit: string;
	recipeRepoCommit: string;
	osArch: OsArch;
	artifactHash: string; // sha256 of the built binary
	toolchainHash: string; // compiler/toolchain fingerprint
	buildLogSha256: string; // hash of the full log; log optionally uploaded
	environment: string; // "aws c7g.4xlarge" | "local" | "e2b sandbox" ...
}

export type SessionState =
	| 'created'
	| 'building'
	| 'results_ready'
	| 'attested'
	| 'expired'
	| 'abandoned';

export interface SessionPublic {
	uuid: string;
	clients: string[];
	instructions: string | null;
	state: SessionState;
	results: BuildResult[];
	createdAt: string;
	ttl: number; // seconds
}

export interface WalletIdentity {
	kind: 'wallet';
	address: string;
	ens?: string | null;
	fid?: number | null;
}

export interface TwitterIdentity {
	kind: 'twitter';
	userId: string;
	handle: string;
}

export type Identity = WalletIdentity | TwitterIdentity;

/** A stored attestation, DB-issued (twitter) or wallet (EAS off-chain). */
export interface AttestationView {
	id: string;
	client: string;
	version: string;
	osArch: OsArch;
	sourceCommit: string;
	recipeHash: string;
	toolchainHash: string;
	artifactHash: string;
	source: 'eas' | 'db';
	identity: Identity;
	createdAt: string;
}

/** An agent-reported arch cohort on a release page (spec §5.1.2). */
export interface HashGroup {
	artifactHash: string;
	count: number;
	identities: Identity[];
	sources: Array<'eas' | 'db'>;
}

export interface ArchCohort {
	osArch: OsArch;
	recipeHash: string;
	groups: HashGroup[];
	divergent: boolean; // >1 distinct hash within this cohort
}
