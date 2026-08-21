# Token-efficiency benchmark — Apollo CLI vs Apollo MCP

Reproducible measurement of how many tokens an agent spends to complete the *same* Apollo task
through the `apollo` CLI versus through the `apollo-work` MCP server (`https://mcp.apollo.io/mcp`).

Built to answer a specific question: **is there a number we can point to when we say the CLI costs
fewer tokens than MCP for high-volume agent pipelines?** This harness produces that number; it does
not assume it.

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
| `--cases <ids>` | all | comma-separated ids from `cases.json` |
| `--max-turns <n>` | `30` | turn cap per run |
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
| `filtered-search` | 1 call, large payload, 4 of ~90 fields needed | An Apollo `people search` page is a big JSON document. The CLI can project with `jq` *before* anything enters the context window; MCP returns the whole payload into context. |
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

- **Same prompt, same model, same turn cap** for both arms.
- **Empty scratch cwd per run** (`mkdtemp`) — no `CLAUDE.md`, no project settings, no repo context.
- **`--settings '{}'`** — the operator's global settings, plugins and enabled MCP servers do not
  leak into either arm.
- **`--strict-mcp-config`** — the CLI arm is given `{"mcpServers":{}}`, so it cannot fall back to
  an MCP server; the MCP arm is given only `apollo-work`.
- **Bash is denied in the MCP arm**, so it cannot shell out to the CLI and win on its behalf.
- **The CLI arm gets the shipped `apollo-cli` skill** copied into its scratch cwd, because that is
  how a real CLI user has it — and its context cost is therefore counted, not hidden. Note the
  asymmetry this creates and keep it in mind when reading the floor case: the skill body is loaded
  *on demand* (progressive disclosure), whereas MCP tool schemas are loaded *up front* for every
  session regardless of whether any are used. That is a real property of the two designs, not a
  measurement artifact.
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
4. **The MCP arm's cost depends on how many tools its server exposes.** `mcp.apollo.io` exposes on
   the order of 140 tools; a server exposing 10 would have a much smaller fixed overhead. The
   result is a statement about *this* MCP server, not about MCP as a protocol.
5. **No numbers are committed here yet.** This directory is the instrument. Run it, commit the
   output under `results/` with the date and model, and cite that.
