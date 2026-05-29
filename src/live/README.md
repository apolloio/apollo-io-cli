# Live API tests

These tests run the **real CLI** against `https://api.apollo.io` to catch bugs the mocked
unit suite can't — most importantly, parameters the API silently ignores or rejects (422).

They are **local-only** and never run in CI. The regular `npm test` (unit/mocked) excludes
this directory.

## Running

```bash
apollo auth login        # one-time; the suite reuses these OAuth credentials
npm run test:live
```

If you're not logged in (no `~/.config/apollo/credentials`), the suite **skips** rather than
fails. Set `APOLLO_SKIP_LIVE=1` to force-skip.

The CLI is invoked as `bun run src/index.ts` by default. Override with
`APOLLO_CLI_CMD` (e.g. `APOLLO_CLI_CMD="node dist/js/index.js"`).

## Tiers (opt-in — writes/side effects are off by default)

| Tier | Enable with | Covers |
|---|---|---|
| **Read-only** (default) | nothing | searches, enrich, schedules, list/usage — zero side effects |
| **Writes** | `APOLLO_LIVE_WRITES=1` + `APOLLO_TEST_TEAM=<team_id>` | create/update with create→assert→delete cleanup |
| **Side-effecting** | `APOLLO_LIVE_DANGEROUS=1` + `APOLLO_TEST_TEAM=<team_id>` | `sequences add-contacts` (sends real email), `sequences approve` (activates) |

> ⚠️ Write and side-effecting tiers mutate real data and **consume credits**. Run them only
> against a **dedicated throwaway team** — never a production team. `APOLLO_TEST_TEAM` is
> required so the suite can assert it is operating on the intended team.

```bash
# CRUD with cleanup
APOLLO_LIVE_WRITES=1 APOLLO_TEST_TEAM=<id> npm run test:live

# everything, including real email / sequence activation (throwaway team only)
APOLLO_LIVE_WRITES=1 APOLLO_LIVE_DANGEROUS=1 APOLLO_TEST_TEAM=<id> npm run test:live
```
