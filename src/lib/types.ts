// Core domain types. Mirrors spec §4 (core objects) and §8 (result shape).

export type OsArch = string; // e.g. "linux/amd64", "linux/arm64", "darwin/arm64"

/** The result an agent POSTs per built project (spec §8). */
export interface BuildResult {
	project: string; // forge-qualified project id, e.g. github/ethereum/go-ethereum
	version: string;
	tag: string;
	sourceCommit: string;
	recipeRepoCommit: string;
	osArch: OsArch; // the build target
	artifactHash: string; // sha256 of the built binary
	toolchainHash: string; // compiler/toolchain fingerprint
	buildLogSha256: string; // hash of the full log; log optionally uploaded
	environment: string; // "aws c7g.4xlarge" | "local" | "e2b sandbox" ...

	// Optional GitHub signing (spec 11/12). Agent-provided: the claimed username
	// and a detached signature over the canonical 10 fields. SSH is accepted in the
	// shape but not yet verified server-side.
	githubUsername?: string;
	gpgSignature?: string;
	sshSignature?: string;
	// Server-populated at upload (never trust an agent-supplied value here).
	githubSig?: GitHubSigStatus;
}

/** Outcome of verifying an agent's GitHub signature, stored on the session result. */
export interface GitHubSigStatus {
	status: 'valid' | 'invalid';
	login: string;
	userId: number | null;
	keyType: 'gpg' | 'ssh';
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
	projects: string[];
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

export interface GitHubIdentity {
	kind: 'github';
	login: string;
	userId: number | null; // stable account id; logins are mutable
	keyFingerprint: string | null;
	keyType: 'gpg' | 'ssh';
}

export type Identity = WalletIdentity | TwitterIdentity | GitHubIdentity;

export type AttestationSource = 'eas' | 'db' | 'github';

/** A stored attestation, DB-issued (twitter) or wallet (EAS off-chain). */
export interface AttestationView {
	id: string;
	project: string;
	version: string;
	osArch: OsArch;
	sourceCommit: string;
	recipeHash: string;
	toolchainHash: string;
	artifactHash: string;
	source: AttestationSource;
	identity: Identity;
	createdAt: string;
}

/** An agent-reported arch cohort on a release page (spec §5.1.2). */
export interface HashGroup {
	artifactHash: string;
	count: number;
	identities: Identity[];
	sources: AttestationSource[];
}

export interface ArchCohort {
	osArch: OsArch;
	recipeHash: string;
	groups: HashGroup[];
	divergent: boolean; // >1 distinct hash within this cohort
}

/** Per-target roll-up for a release card (project page). */
export interface TargetSummary {
	osArch: OsArch;
	positive: number; // attestations agreeing on the dominant hash
	negative: number; // attestations on a divergent hash
	divergent: boolean;
	attested: boolean; // false = declared by the release but not yet attested
}

export interface ReleaseCard {
	tag: string;
	publishedAt: string | null;
	prerelease: boolean;
	url: string | null;
	targets: TargetSummary[];
	totalAttestations: number;
}
