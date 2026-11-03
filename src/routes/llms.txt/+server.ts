import { text } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

// GET /llms.txt  (llmstxt.org convention, spec §6)
export const GET: RequestHandler = async ({ url }) => {
	const rows = await db.select().from(clients);
	const list = rows
		.map((c) => `- [${c.name}](${url.origin}/clients/${c.id}): ${c.repo} (${c.layer})`)
		.join('\n');

	const body = `# legit.build

> Public attestations that an Ethereum client release builds to a given binary hash.
> We do not run builds and do not prove honesty — we record claims and surface
> agreement and divergence across independent builders.

## Clients

${list}

## Contribute (build & attest)

Start a session, then paste the given line into your coding agent:

    POST ${url.origin}/api/sessions  {"clients": ["reth","nimbus"], "instructions": "optional"}
    -> { uuid, uploadToken, attestUrl, instructionsUrl, contributeLine }

The agent fetches ${url.origin}/attest/<uuid>/llms.txt and follows it: build the pinned
recipe per client, POST each result, POST /complete. The human signs approved results
in the browser (wallet off-chain EAS, or Twitter trusted-issuer).

## Result schema (agent -> us)

    { client, version, tag, sourceCommit, recipeRepoCommit, osArch,
      artifactHash, toolchainHash, buildLogSha256, environment }

## More

- Full recipe text: ${url.origin}/llms-full.txt
- EAS schema and merge: attestations are read from our DB and unioned with easscan.
`;
	return text(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
