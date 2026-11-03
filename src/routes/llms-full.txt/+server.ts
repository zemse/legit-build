import { text } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { BATCH_SCHEMA } from '$lib/eas/schema';
import type { RequestHandler } from './$types';

// GET /llms-full.txt  : the inline, fuller version (spec §6, llmstxt.org).
export const GET: RequestHandler = async ({ url }) => {
	const rows = await db.select().from(projects);
	const list = rows
		.map((p) => `- ${p.name ?? p.repo} (${p.id})${p.layer ? ` [${p.layer}, ${p.lang}]` : ''}`)
		.join('\n');

	const body = `# legit.build: full instructions

## What this is

A public index of independent attestations that a given software release binary
hashes to a given value. Projects are forge-qualified (github/owner/repo, gitlab/owner/repo).
Two attestation paths:
- Wallet: the builder signs one EAS off-chain attestation (gas-free) over the batch.
- Twitter: the builder authenticates with X; the backend (trusted issuer) signs on their behalf.

We do not run builds. Agents/users run them on their own machine, AWS, or a sandbox.
We do not prove a build is honest; we surface agreement and divergence (N-of-M corroboration).

## Tracked projects

${list}

## Reproducibility

Honest builds on the SAME os/arch should converge only if the recipe pins toolchain version,
SOURCE_DATE_EPOCH, build flags, and the container base image by digest. Recipes live in a
separate repo (WIP). Builders report their own os/arch; the site compares per architecture,
so cross-arch differences are expected and not flagged; only divergence within a cohort is.

## Flow

1. POST ${url.origin}/api/sessions {"projects":[...], "instructions":"..."} -> {uuid, uploadToken, contributeLine}
2. Paste contributeLine into your agent.
3. Agent GET ${url.origin}/attest/<uuid>/llms.txt and follows it.
4. Agent POSTs each result to /api/sessions/<uuid>/results (Bearer uploadToken), then /complete.
5. Human reviews at ${url.origin}/attest/<uuid> and signs approved results.

## Result schema

    { project, version, tag, sourceCommit, recipeRepoCommit, osArch,
      artifactHash, toolchainHash, buildLogSha256, environment }

## EAS batch schema (off-chain, one signature per session)

    ${BATCH_SCHEMA}

Arrays are index-aligned; one attestation covers every approved project in the session.
`;
	return text(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
