# legit.build

Public attestation site for Ethereum client binary reproducibility. Lists every tracked
client, its releases, and independent attestations that a release builds to a given binary
hash — grouped by architecture, with divergence flagged. Builders run the build themselves
(agent relay) and sign the result with a wallet (EAS off-chain) or Twitter (trusted issuer).

Spec: `research/ethereum/devcon8-binary-verification-talk/10-attestation-site-spec.md`.

## Stack

- SvelteKit 2 + Svelte 5 + Tailwind 4, deployed on Vercel (`adapter-vercel`).
- Drizzle ORM on Neon Postgres.
- EAS off-chain attestations (Base Sepolia for the PoC) via `@ethereum-attestation-service/eas-sdk`.
- SSE relay (DB is the source of truth; the stream is a notify layer with `Last-Event-ID` resume).

## Setup

```bash
pnpm install

# Pull the Neon DATABASE_URL (the Vercel Neon integration wired it) into .env
vercel link            # link this dir to the legit-build Vercel project
vercel env pull .env

# Fill the rest of .env from .env.example (AUTH_SECRET, Twitter, Neynar, EAS issuer key…)

pnpm db:push           # create tables from the Drizzle schema
pnpm db:seed           # seed the tracked clients
pnpm eas:register      # register the EAS batch schema -> set PUBLIC_EAS_SCHEMA_UID in .env

pnpm dev
```

Trigger the release poller once to backfill releases:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:5173/api/cron/poll-releases
```

## Key routes

- `/` landing, `/clients/:id`, `/clients/:id/releases/:tag` (cohort view)
- `/start` session builder, `/attest/:uuid` live + sign, `/attest/:uuid/llms.txt` agent instructions
- `/contribute` agent entrypoint (prompt is a placeholder, WIP)
- `/llms.txt`, `/llms-full.txt`
- `POST /api/sessions`, `/api/sessions/:uuid/{results,complete,events}`, `/api/attestations`, `/api/attest/twitter`

## Known gaps (tracked in the spec)

- `uploadToken` is currently embedded in the agent instructions, so anyone with the `uuid`
  can read it (spec §7 OPEN). Move token delivery off the uuid-fetchable path before launch.
- Recipes repo (deterministic builds) is a placeholder pending the reproducibility work.
- On-chain publishing (Base timestamp anchor + opt-in full on-chain) is v2; v1 is off-chain.
