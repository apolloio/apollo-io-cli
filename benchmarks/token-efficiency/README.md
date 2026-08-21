# Token-efficiency benchmark — Apollo CLI vs Apollo MCP

Reproducible measurement of how many tokens an agent spends to complete the *same* Apollo task
through the `apollo` CLI versus through the `apollo-work` MCP server (`https://mcp.apollo.io/mcp`).

Built to answer a specific question: **is there a number we can point to when we say the CLI costs
fewer tokens than MCP for high-volume agent pipelines?** This harness produces that number; it does
not assume it.

## Latest result

[`results/2026-08-21-sonnet-5.md`](results/2026-08-21-sonnet-5.md) — `claude-sonnet-5`, 3 reps/arm/case:

| Case | MCP tokens | CLI tokens | CLI saves |
|---|---:|---:|---:|
| Single company enrichment | 262,979 | 120,786 | **+54.1%** |
| Filtered people search | 405,040 | 566,471 | **−39.9%** |
| Chained multi-entity pipeline | 2,748,188 | 1,061,312 | **+61.4%** |

Equal-weighted mean **+25.2%**; pooled **+48.8%**.

The mean lands on "25% fewer tokens" almost exactly — but it is the average of +54%, −40%
and +61%, so no real workload is described by "about a quarter". **The direction flips with
workload shape.** Read the caveats in the results doc before quoting anything.

## Run it

```bash
apollo auth whoami                      # both arms hit the live API — be logged in
node benchmarks/token-efficiency/run.ts # Node >= 23.6
# Node 22.x:
node --experimental-strip-types benchmarks/token-efficiency/run.ts
```

The MCP arm needs `apollo-work` to be authorized once in an interactive session
(`claude mcp add --transport http apollo-work https://mcp.apollo.io/mcp`, then `/mcp` → authenticate).
An unauthenticated `tools/list` against `https://mcp.apollo.io/mcp` returns `401`, so the MCP arm
fails closed rather than silently measuring an empty tool surface.

| Flag | Default | |
|---|---|---|
| `--reps <n>` | `3` | repetitions per arm per case; the **median** is reported |
| `--model <id>` | `claude-sonnet-5` | same model for both arms |
| `--effort <level>` | `medium` | reasoning effort, pinned across both arms |
| `--cases <ids>` | all | comma-separated ids from `cases.json` |
| `--budget <usd>` | `1.00` | per-run spend cap (`--max-budget-usd`) |
| `--timeout <sec>` | `300` | per-run wall-clock cap before the child is killed |
| `--keep` | off | keep the scratch workspaces for transcript inspection |
| `--out <path>` | `results.json` | raw per-run data |

Output is a markdown table plus the average, printed to stdout and dumped with every raw run to
`results.json` (gitignored — commit a copy under `results/` if you want to cite it).

## The three cases

Chosen to span the shapes that actually drive the cost difference, from the one where MCP is most
competitive to the one Andy's "high-volume pipeline" claim is about.

| Case | Shape | Why it's here |
|---|---|---|
| `single-enrich` | 1 call, small payload | Floor case. Almost all of the delta is fixed tool-definition overhead, so this is where MCP looks best. |
| `filtered-search` | 1 call, compact payload | Intended as the CLI's projection win, but measurement showed Apollo's `people search` returns only 11 fields per person (465 B each, 16.6 KB for 25) — so there is little to project away. MCP does load the full payload (15.7 KB vs the CLI's `jq`-projected 2.4 KB), but ~11k tokens of savings is ~2% of a 400k-token run. |
| `chained-pipeline` | ~11–21 calls, fan-out per company | Search → per-company job postings → per-company decision-maker. The CLI composes this in a shell pipeline; MCP pays a round trip, and a full result payload, per hop. |

Edit `cases.json` to add cases; ids are the handles for `--cases`.

## What is being measured

`claude -p --output-format json` reports `usage` and `total_cost_usd` per run. The harness records
all four token buckets and derives three metrics:

- **`totalTokens`** — raw sum of `input + cache_creation + cache_read + output`. This is the
  headline number, and the one to quote as "tokens consumed".
- **`billableEquivalent`** — cost-weighted (`cache_read × 0.1`, `cache_creation × 1.25`), so an arm
  that re-reads a large cached prefix on every turn isn't charged as if it paid full price for it.
  Quote this when the argument is about spend rather than context pressure.
- **`total_cost_usd`** — what Anthropic actually billed.

Percent difference, in the direction the claim is stated:

```
CLI saving = (mcpTokens - cliTokens) / mcpTokens × 100
```

Reported per case, then as an **equal-weighted mean across cases** (the "average" asked for) and as
a **pooled** figure over summed tokens. The two differ, and the difference is informative: the mean
lets the cheap single-lookup case count as much as the pipeline case, while the pooled figure is
closer to what a real high-volume workload would bill. Report both; don't pick the flattering one.

## Why the comparison is fair

Structural differences between the two arms are the thing being measured, so everything else is
pinned:

- **Same prompt, same model, same effort level, same per-run budget cap** for both arms.
- **Empty scratch cwd per run** (`mkdtemp`) — no `CLAUDE.md`, no project settings, no repo context.
- **`--setting-sources project`** — loads project settings only. This keeps the operator's
  user-level settings and globally-enabled plugins (which contribute a dozen-plus extra skills)
  out of *both* arms, while still discovering the scratch cwd's `.claude/skills`. Note that
  `--setting-sources ""` is *not* usable here: it also stops the cwd skill from being discovered,
  silently gutting the CLI arm.
- **`--strict-mcp-config`** — the CLI arm is given `{"mcpServers":{}}`, so it cannot fall back to
  an MCP server; the MCP arm is given only `apollo-work`.
- **Bash is denied in the MCP arm**, so it cannot shell out to the CLI and win on its behalf.
- **The CLI arm gets the shipped `apollo-cli` skill** copied into its scratch cwd, because that is
  how a real CLI user has it — so its context cost is counted, not hidden.
- **Median of N reps**, because agent trajectories vary run to run. Raise `--reps` before quoting a
  number externally; 3 is enough to spot a wild run, not enough to be a confidence interval.

## Known limitations — read before quoting a number

1. **Live data moves.** Both arms hit the production Apollo API, so payload sizes shift as the
   underlying data changes. Numbers are comparable within a single benchmark run, not across weeks.
2. **Trajectory variance is the dominant noise source.** An agent that decides to make one extra
   exploratory call can swing a case by tens of thousands of tokens. Check `numTurns` in the table:
   if the two arms took very different turn counts, you are partly measuring planning luck.
3. **Credit consumption.** These are real Apollo API calls. `filtered-search` and
   `chained-pipeline` consume credits on every rep — `--reps 3` across 3 cases is 18 runs.
4. **The MCP arm's cost depends on how many tools its server exposes _and on whether the client
   loads them eagerly_.** See the finding below — this is the single biggest thing to understand
   before quoting any number.
5. The result is a statement about *this* MCP server and *this* client version, not about MCP as a
   protocol. In Claude Code 2.1.238 the ~90 `apollo-work` tools are **deferred behind `ToolSearch`**
   rather than loaded into context up front, so the MCP arm does not pay a per-schema tax every
   session — which removes much of the usual justification for expecting a large CLI win.
6. **A run that doesn't finish must never be scored.** The MCP server's credit-cost annotations make
   the agent stop and ask for confirmation; that spends few tokens and looks like efficiency. Both
   arms get an identical pre-approval suffix, and every run must pass `gradeComplete()`.
