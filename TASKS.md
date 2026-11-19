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

## Automated rebuilds (GitHub Actions)

Trigger: poll, no cross-repo push exists. Actions `schedule` (15 min) + `workflow_dispatch` (manual/backfill)

- `repository_dispatch` fired by the daily Vercel cron as a heartbeat (schedules die after 60 idle days).
  Jobs: `plan` (no build) -> `build` matrix (no secrets, runs upstream code) -> `report` (holds BUILDER_TOKEN, posts).

Phase 0, recipes (before any automation, else the bot drifts like geth did)

- [ ] ethrex: pin apt to snapshot.ubuntu.com at tag commit time (gcc/clang/cmake float today).
- [ ] teku, besu: same snapshot pin (only `git`, low risk, but keep the rule uniform).
- [ ] reth: derive RUST_TOOLCHAIN per tag instead of a hand-passed value.
- [ ] erigon: patch vendored mdbx.c build timestamp to the commit date -> rebuilder agreement.
- [ ] meta.json `official`: asset name pattern + path inside archive, per recipe that targets the release binary
      (geth, ethrex, nethermind, lighthouse, besu jar). `target: official | rebuilders` field.
- [ ] Recipe lint in CI: fail on unpinned image tags, `:main`/`:latest`, unpinned apt.

Phase 1, server

- [ ] `build_runs` table: project, tag, osArch, recipeRepoCommit, status (queued/running/match/mismatch/
      diverged/failed), artifactHash, officialHash, runUrl, logUrl, error, timestamps. Unique on the first four.
- [ ] `POST /api/builds/plan` (Bearer BUILDER_TOKEN): refresh releases, return + claim pending jobs.
      Scope: non-prerelease, published after go-live; older via manual dispatch. Validate tag charset.
- [ ] `POST /api/builds/report`: store run, upload result as attester `ci:legit.build`, source `ci`.
- [ ] UI: "legit.build CI" badge, official-binary verdict, run link; CI excluded from independent count.
- [ ] Copy: llms.txt / about say "we do not run builds"; update.

Phase 2, workflow (geth + nethermind only, manual dispatch first)

- [ ] `.github/workflows/rebuild.yml`: permissions contents:read, tag passed via env (no `${{ }}` in run),
      free-disk step, per-job timeout, concurrency group per project@tag@arch, log uploaded as artifact.
- [ ] Official hash: download release asset, extract, hash, compare.
- [ ] Turn on schedule after 3 clean manual runs.

Phase 3, rollout

- [ ] Add one client at a time: rebuild its last known-good release first, require the recorded hash.
- [ ] linux/arm64 on `ubuntu-24.04-arm` for JVM clients; no darwin (no Docker on macOS runners).
- [ ] Non-converging (nimbus x2, grandine, lodestar): build, record as expected divergence.

Phase 4, keep it honest

- [ ] Weekly canary: rebuild last verified release per recipe; hash change = drift alarm.
- [ ] Auto-open issue on failed/mismatch.
- [ ] Sigstore provenance (`actions/attest-build-provenance`), verified server side.

## Nice-to-have

- [ ] Reputation/divergence ranking surfaced in the UI (weights exist in `reputation.ts`).
- [ ] easscan GraphQL merge wired into a periodic job (`fetchEasscanAttestations` exists).
- [ ] Build-log storage decision (hash-only vs hosted link) — currently hash-only.
