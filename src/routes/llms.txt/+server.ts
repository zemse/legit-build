import { text } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

// GET /llms.txt  (llmstxt.org convention, spec §6)
export const GET: RequestHandler = async ({ url }) => {
	const rows = await db.select().from(projects);
	const list = rows
		.map((p) => `- [${p.name ?? p.repo}](${url.origin}/p/${p.id}): ${p.id}`)
		.join('\n');

	const body = `# legit.build

> Public attestations that a software release builds to a given binary hash.
> We do not run builds and do not prove honesty — we record claims and surface
> agreement and divergence across independent builders.

## Projects

${list}

## Contribute (build & attest)

Start a session, then paste the given line into your coding agent:

    POST ${url.origin}/api/sessions  {"projects": ["github/paradigmxyz/reth"], "instructions": "optional"}
    -> { uuid, uploadToken, attestUrl, instructionsUrl, contributeLine }

The agent fetches ${url.origin}/attest/<uuid>/llms.txt and follows it: build the pinned
recipe per project, POST each result, POST /complete. The human signs approved results
in the browser (wallet off-chain EAS, or Twitter trusted-issuer).

## Result schema (agent -> us)

    { project, version, tag, sourceCommit, recipeRepoCommit, osArch,
      artifactHash, toolchainHash, buildLogSha256, environment }

## More

- Full recipe text: ${url.origin}/llms-full.txt
- EAS schema and merge: attestations are read from our DB and unioned with easscan.
`;
	return text(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
