# TASKS

## Done (automated this session)

- [x] Neon connected to the `legit-build` Vercel project (all envs); `DATABASE_URL` wired.
- [x] Schema applied to Neon (`drizzle migrate`), 11 projects seeded.
- [x] Release backfill for the 5 execution clients (consensus pending — see GITHUB_TOKEN below).
- [x] `AUTH_SECRET` + `CRON_SECRET` generated and set in Vercel (prod/preview/dev) + local `.env`.
- [x] GitHub → Vercel auto-deploy connected (pushes to `main` deploy).
- [x] Deployed to production; **https://legit.build** live and serving from Neon.

## Blocked on you (external accounts / funds I can't provide)

- [ ] **GITHUB_TOKEN in Vercel** so the daily cron backfills all 11 projects (the 6 consensus
      clients hit the unauthenticated rate limit; Vercel's shared egress IPs make unauthenticated
      polling unreliable). Create a fine-grained read-only PAT and:
      `printf '%s' <token> | vercel env add GITHUB_TOKEN production` (repeat preview/development),
      or add it in the Vercel dashboard. Optionally `GITLAB_TOKEN` if you add GitLab projects.
- [ ] **EAS schema + issuer key.** Generate an issuer key, set `EAS_ISSUER_PRIVATE_KEY`, fund its
      address with Base Sepolia ETH (faucet), run `pnpm eas:register`, set the printed UID as
      `PUBLIC_EAS_SCHEMA_UID` in Vercel. Until then browsing works; wallet/Twitter signing needs it.
- [ ] **Twitter OAuth app** (X developer portal): set `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`,
      `PUBLIC_TWITTER_REDIRECT_URI=https://legit.build/auth/twitter/callback` in Vercel.
- [ ] **NEYNAR_API_KEY** (optional) for ENS/Farcaster reputation display.

## Known gaps (from the spec, by design for v1)

- [ ] `uploadToken` is embedded in `/attest/:uuid/llms.txt`, so anyone with the `uuid` can read it
      (spec §7 OPEN). Move token delivery off the uuid-fetchable path. Owned by the other session.
- [ ] `/contribute` prompt body is a placeholder; final wording pending the recipe/build session.
- [ ] Recipes repo (deterministic builds) does not exist yet — `RECIPES_REPO` placeholder in
      `src/lib/server/instructions.ts`. Gates real corroboration (spec §12, §15.1).
- [ ] On-chain publishing (Base `multiTimestamp()` anchor + opt-in full on-chain) is v2.

## Nice-to-have

- [ ] Reputation/divergence ranking surfaced in the UI (weights exist in `reputation.ts`).
- [ ] easscan GraphQL merge wired into a periodic job (`fetchEasscanAttestations` exists).
- [ ] Build-log storage decision (hash-only vs hosted link) — currently hash-only.
