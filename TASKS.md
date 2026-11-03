# TASKS

## Blocked on you (accounts/secrets I can't provide)

- [ ] **Connect Neon to the project.** Vercel dashboard → `legit-build` project → Storage →
      Connect Store → `neon-cerulean-prism` (or the Neon resource page → Connected Projects →
      add `legit-build`). Then `vercel env pull .env` gets `DATABASE_URL`.
- [ ] After `DATABASE_URL` is present: `pnpm db:push` then `pnpm db:seed`, then trigger the
      poller once: `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/poll-releases`.
- [ ] **Fill `.env`** from `.env.example`: `AUTH_SECRET` (random 32B), Twitter OAuth
      (`TWITTER_CLIENT_ID/SECRET`), `NEYNAR_API_KEY`, `GITHUB_TOKEN` (optional), `CRON_SECRET`.
- [ ] **EAS issuer key + schema.** Set `EAS_ISSUER_PRIVATE_KEY`, fund it with Base Sepolia ETH,
      run `pnpm eas:register`, set the printed UID as `PUBLIC_EAS_SCHEMA_UID`.
- [ ] `vercel deploy` (or push to GitHub + connect) once the above env is set in Vercel.

## Known gaps (from the spec, by design for v1)

- [ ] `uploadToken` is embedded in `/attest/:uuid/llms.txt`, so anyone with the `uuid` can read
      it (spec §7 OPEN). Move token delivery off the uuid-fetchable path. Owned by the other session.
- [ ] `/contribute` prompt body is a placeholder; final wording pending the recipe/build session.
- [ ] Recipes repo (deterministic builds) does not exist yet — `RECIPES_REPO` is a placeholder in
      `src/lib/server/instructions.ts`. Gates real corroboration (spec §12, §15.1).
- [ ] On-chain publishing (Base `multiTimestamp()` anchor + opt-in full on-chain) is v2.

## Nice-to-have

- [ ] Reputation/divergence ranking surfaced in the UI (weights exist in `reputation.ts`, not shown).
- [ ] easscan GraphQL merge wired into a periodic job (function exists: `fetchEasscanAttestations`).
- [ ] Build-log storage decision (hash-only vs hosted link) — currently hash-only.
