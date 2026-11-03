import { SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import type { BuildResult } from '$lib/types';

/**
 * Batch off-chain schema (spec §9, v1 default).
 * Array-typed so ONE attestation (one wallet signature) covers every approved
 * project in a session. Arrays are index-aligned.
 */
export const BATCH_SCHEMA =
	'string[] project,string[] version,string[] osArch,bytes32[] artifactHash,bytes32[] sourceCommit,bytes32[] recipeHash,bytes32[] toolchainHash';

/** Per-build scalar schema kept for the v2 on-chain / multiAttest path. */
export const SCALAR_SCHEMA =
	'bytes32 artifactHash,string project,string version,string osArch,bytes32 sourceCommit,bytes32 recipeHash,bytes32 toolchainHash';

/** Normalize a hash/commit of any accepted form into a 0x-prefixed bytes32. */
export function toBytes32(input: string): string {
	let h = input.trim().toLowerCase();
	if (h.startsWith('sha256:')) h = h.slice(7);
	if (h.startsWith('0x')) h = h.slice(2);
	h = h.replace(/[^0-9a-f]/g, '');
	if (h.length > 64) h = h.slice(0, 64);
	// Right-pad shorter digests (e.g. a 40-hex git sha1) with zeros.
	h = h.padEnd(64, '0');
	return '0x' + h;
}

export interface BatchFields {
	project: string[];
	version: string[];
	osArch: string[];
	artifactHash: string[];
	sourceCommit: string[];
	recipeHash: string[];
	toolchainHash: string[];
}

export function resultsToBatchFields(results: BuildResult[]): BatchFields {
	return {
		project: results.map((r) => r.project),
		version: results.map((r) => r.version),
		osArch: results.map((r) => r.osArch),
		artifactHash: results.map((r) => toBytes32(r.artifactHash)),
		sourceCommit: results.map((r) => toBytes32(r.sourceCommit)),
		recipeHash: results.map((r) => toBytes32(r.recipeRepoCommit)),
		toolchainHash: results.map((r) => toBytes32(r.toolchainHash))
	};
}

/** ABI-encode a batch of results for the EAS attestation `data` field. */
export function encodeBatch(results: BuildResult[]): string {
	const f = resultsToBatchFields(results);
	const encoder = new SchemaEncoder(BATCH_SCHEMA);
	return encoder.encodeData([
		{ name: 'project', value: f.project, type: 'string[]' },
		{ name: 'version', value: f.version, type: 'string[]' },
		{ name: 'osArch', value: f.osArch, type: 'string[]' },
		{ name: 'artifactHash', value: f.artifactHash, type: 'bytes32[]' },
		{ name: 'sourceCommit', value: f.sourceCommit, type: 'bytes32[]' },
		{ name: 'recipeHash', value: f.recipeHash, type: 'bytes32[]' },
		{ name: 'toolchainHash', value: f.toolchainHash, type: 'bytes32[]' }
	]);
}

/** Decode the batch `data` field back into per-index subject rows. */
export interface DecodedSubject {
	project: string;
	version: string;
	osArch: string;
	artifactHash: string;
	sourceCommit: string;
	recipeHash: string;
	toolchainHash: string;
}

export function decodeBatch(data: string): DecodedSubject[] {
	const encoder = new SchemaEncoder(BATCH_SCHEMA);
	const decoded = encoder.decodeData(data);
	const byName = Object.fromEntries(decoded.map((d) => [d.name, d.value.value as unknown]));
	const arr = (k: string) => (byName[k] as unknown[]).map((v) => String(v));
	const project = arr('project');
	const version = arr('version');
	const osArch = arr('osArch');
	const artifactHash = arr('artifactHash');
	const sourceCommit = arr('sourceCommit');
	const recipeHash = arr('recipeHash');
	const toolchainHash = arr('toolchainHash');
	return project.map((_, i) => ({
		project: project[i],
		version: version[i],
		osArch: osArch[i],
		artifactHash: artifactHash[i],
		sourceCommit: sourceCommit[i],
		recipeHash: recipeHash[i],
		toolchainHash: toolchainHash[i]
	}));
}
