#!/usr/bin/env node
/**
 * Token-efficiency benchmark: Apollo CLI vs Apollo MCP.
 *
 * Runs the same natural-language task through headless Claude twice per case:
 *   - "cli" arm: no MCP servers at all; Bash + the apollo-cli skill.
 *   - "mcp" arm: only the apollo-work MCP server; Bash denied so it cannot shell out.
 *
 * Everything else (model, prompt, turn cap, empty scratch cwd, minimal settings) is
 * held identical, so the delta is attributable to the tool surface.
 *
 * Usage:
 *   node benchmarks/token-efficiency/run.ts                       # Node >= 23.6
 *   node --experimental-strip-types benchmarks/token-efficiency/run.ts   # Node 22.x
 *
 * Options:
 *   --reps <n>        repetitions per arm per case (default 3, median reported)
 *   --model <id>      model for both arms (default claude-sonnet-5)
 *   --effort <level>  reasoning effort for both arms (default medium)
 *   --cases <ids>     comma-separated case ids to run (default: all)
 *   --arms <arms>     comma-separated arms to run: cli,mcp (default both)
 *   --budget <usd>    per-run spend cap handed to --max-budget-usd (default 6.00)
 *   --timeout <sec>   per-run wall-clock cap before the child is killed (default 300)
 *   --keep            keep the scratch workspaces for transcript inspection
 *   --out <path>      write raw results JSON here (default results.json alongside this file)
 */

import { spawn } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const APOLLO_WORK_MCP_URL = "https://mcp.apollo.io/mcp";

type Arm = "cli" | "mcp";

type Case = {
  id: string;
  name: string;
  shape: string;
  prompt: string;
  /** Completion gate — see gradeComplete(). */
  grade: { minRows: number; mustContain: string[] };
};

/**
 * Appended verbatim to every prompt in BOTH arms.
 *
 * Without this the comparison is invalid. The MCP server annotates credit-consuming
 * tools with cost warnings, so the agent frequently stops and asks "this will cost 10
 * credits, proceed?" — burning a fraction of the tokens and never finishing the task.
 * The CLI surfaces no such warning and just does the work. Left uncontrolled, the MCP
 * arm books a cheap "win" for abandoning the task.
 */
const PROMPT_SUFFIX =
  "\n\nThis is an automated benchmark run with no interactive user. Credit spend is pre-approved: " +
  "do not ask for confirmation, do not ask clarifying questions, and do not stop to flag cost. " +
  "Complete the whole task and output only the final answer.";

/** The four token buckets Claude Code reports, plus derived totals. */
type Usage = {
  inputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  /** Raw sum of every bucket — the headline "tokens consumed" number. */
  totalTokens: number;
  /**
   * Cost-weighted equivalent, so a run that reads a big cached prefix is not
   * penalised as if it had paid full price for it: cache reads bill at 0.1x and
   * cache writes at 1.25x of base input.
   */
  billableEquivalent: number;
  costUsd: number;
  numTurns: number;
  durationMs: number;
};

type Run = Usage & {
  arm: Arm;
  caseId: string;
  rep: number;
  /** The claude invocation returned a parseable, non-error result. */
  ok: boolean;
  /** ok AND the answer actually satisfies the case's completion gate. */
  complete: boolean;
  resultText: string;
  error?: string;
};

/**
 * A run only counts if it did the job. An agent that answers "shall I proceed?" spends
 * few tokens and must not be scored as efficient. Counts markdown table data rows and
 * checks for required substrings.
 */
function gradeComplete(text: string, grade: Case["grade"]): boolean {
  const lower = text.toLowerCase();
  if (grade.mustContain.some((m) => !lower.includes(m.toLowerCase()))) return false;
  if (grade.minRows > 0) {
    const rows = text
      .split("\n")
      .filter((l) => l.trim().startsWith("|") && l.includes("|", 1))
      .filter((l) => !/^\s*\|[\s|:-]*\|\s*$/.test(l));
    // minus the header row
    if (rows.length - 1 < grade.minRows) return false;
  }
  return true;
}

function parseArgs(argv: string[]) {
  const opts = {
    reps: 3,
    model: "claude-sonnet-5",
    effort: "medium",
    cases: [] as string[],
    arms: ["cli", "mcp"] as Arm[],
    budget: 6.0,
    timeout: 300,
    keep: false,
    out: join(HERE, "results.json"),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--reps") opts.reps = Number(argv[++i]);
    else if (a === "--model") opts.model = argv[++i];
    else if (a === "--effort") opts.effort = argv[++i];
    else if (a === "--cases") opts.cases = argv[++i].split(",").map((s) => s.trim());
    else if (a === "--arms") opts.arms = argv[++i].split(",").map((s) => s.trim()) as Arm[];
    else if (a === "--budget") opts.budget = Number(argv[++i]);
    else if (a === "--timeout") opts.timeout = Number(argv[++i]);
    else if (a === "--keep") opts.keep = true;
    else if (a === "--out") opts.out = resolve(argv[++i]);
    else throw new Error(`unknown option: ${a}`);
  }
  return opts;
}

/**
 * A scratch cwd per run: no CLAUDE.md, no project settings, nothing inherited from
 * the repo or the user's home. The CLI arm additionally gets a copy of the shipped
 * apollo-cli skill, which is how a real CLI user actually has it.
 */
function makeWorkspace(arm: Arm): string {
  const dir = mkdtempSync(join(tmpdir(), `apollo-tokenbench-${arm}-`));
  if (arm === "cli") {
    mkdirSync(join(dir, ".claude", "skills"), { recursive: true });
    cpSync(join(REPO_ROOT, ".claude", "skills", "apollo-cli"), join(dir, ".claude", "skills", "apollo-cli"), {
      recursive: true,
    });
  }
  return dir;
}

function armFlags(arm: Arm): string[] {
  if (arm === "cli") {
    return [
      // No MCP servers whatsoever — the CLI arm must not be able to fall back to one.
      "--strict-mcp-config",
      "--mcp-config",
      JSON.stringify({ mcpServers: {} }),
      // Unscoped Bash on purpose: `apollo … | jq …` pipelines are the thing being
      // measured, and a scoped Bash(apollo:*) rule rejects a pipeline outright.
      // --allowedTools is variadic, so each name is its own argv entry.
      "--allowedTools",
      "Bash",
      "Skill",
      "Read",
    ];
  }
  return [
    "--strict-mcp-config",
    "--mcp-config",
    JSON.stringify({ mcpServers: { "apollo-work": { type: "http", url: APOLLO_WORK_MCP_URL } } }),
    // Bash denied so the MCP arm cannot quietly shell out to the CLI and win on its behalf.
    "--disallowedTools",
    "Bash",
    // ToolSearch matters here: this client defers large MCP tool sets, so the agent
    // has to search for an apollo-work tool before it can call one.
    "--allowedTools",
    "mcp__apollo-work",
    "ToolSearch",
    "Read",
  ];
}

function claude(arm: Arm, c: Case, opts: ReturnType<typeof parseArgs>): Promise<Run> {
  const cwd = makeWorkspace(arm);
  const args = [
    "-p",
    c.prompt + PROMPT_SUFFIX,
    "--output-format",
    "json",
    "--model",
    opts.model,
    "--effort",
    opts.effort,
    "--max-budget-usd",
    String(opts.budget),
    "--permission-mode",
    "acceptEdits",
    // Load project settings only: picks up the scratch cwd's .claude/skills (so the
    // CLI arm actually gets the apollo-cli skill) while keeping the operator's
    // user-level settings and globally-enabled plugins out of *both* arms. With
    // `--setting-sources ""` the cwd skill is not discovered either.
    "--setting-sources",
    "project",
    ...armFlags(arm),
  ];

  return new Promise((resolveRun) => {
    const child = spawn("claude", args, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, opts.timeout * 1000);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", () => {
      clearTimeout(timer);
      const result = parseResult(stdout, stderr, arm, c, cwd);
      if (timedOut) { result.ok = false; result.complete = false; result.error = `timed out after ${opts.timeout}s; ${result.error ?? ""}`; }
      if (!opts.keep) rmSync(cwd, { recursive: true, force: true });
      resolveRun(result);
    });
  });
}

function parseResult(stdout: string, stderr: string, arm: Arm, c: Case, cwd: string): Run {
  const caseId = c.id;
  const empty: Run = {
    arm,
    caseId,
    rep: 0,
    ok: false,
    complete: false,
    resultText: "",
    inputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    billableEquivalent: 0,
    costUsd: 0,
    numTurns: 0,
    durationMs: 0,
  };
  let parsed: any;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { ...empty, error: `unparseable output (cwd ${cwd}): ${stderr.slice(0, 400) || stdout.slice(0, 400)}` };
  }
  if (parsed.is_error) return { ...empty, error: `claude reported an error: ${String(parsed.result).slice(0, 400)}` };

  // Prefer modelUsage: top-level `usage` reports only the main model, but a run also
  // burns tokens on Haiku side-calls (titling, quick classification). Those are real
  // spend and appear in total_cost_usd, so they belong in the token total too.
  const resultText = String(parsed.result ?? "");
  const models: any[] = Object.values(parsed.modelUsage ?? {});
  const u = parsed.usage ?? {};
  const sum = (k: string, fallback: number) =>
    models.length ? models.reduce((a, m) => a + (m[k] ?? 0), 0) : fallback;
  const inputTokens = sum("inputTokens", u.input_tokens ?? 0);
  const cacheCreationTokens = sum("cacheCreationInputTokens", u.cache_creation_input_tokens ?? 0);
  const cacheReadTokens = sum("cacheReadInputTokens", u.cache_read_input_tokens ?? 0);
  const outputTokens = sum("outputTokens", u.output_tokens ?? 0);
  return {
    arm,
    caseId,
    rep: 0,
    ok: true,
    complete: gradeComplete(resultText, c.grade),
    resultText,
    inputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    outputTokens,
    totalTokens: inputTokens + cacheCreationTokens + cacheReadTokens + outputTokens,
    billableEquivalent: inputTokens + cacheCreationTokens * 1.25 + cacheReadTokens * 0.1 + outputTokens,
    costUsd: parsed.total_cost_usd ?? 0,
    numTurns: parsed.num_turns ?? 0,
    durationMs: parsed.duration_ms ?? 0,
  };
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Positive = the CLI arm spent fewer tokens than the MCP arm. */
function savingsPct(mcp: number, cli: number): number {
  if (!mcp) return 0;
  return ((mcp - cli) / mcp) * 100;
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (n: number) => `${n >= 0 ? "" : "-"}${Math.abs(n).toFixed(1)}%`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const all: Case[] = JSON.parse(readFileSync(join(HERE, "cases.json"), "utf8"));
  const cases = opts.cases.length ? all.filter((c) => opts.cases.includes(c.id)) : all;
  if (!cases.length) throw new Error(`no cases matched ${opts.cases.join(",")}`);

  const runs: Run[] = [];
  for (const c of cases) {
    for (const arm of opts.arms) {
      for (let rep = 1; rep <= opts.reps; rep++) {
        process.stderr.write(`→ ${c.id} / ${arm} / rep ${rep}/${opts.reps} … `);
        const run = await claude(arm, c, opts);
        run.rep = rep;
        runs.push(run);
        // Flush after every run: an 18-run sweep takes over an hour, and losing the
        // whole dataset to a kill at run 17 is not an acceptable failure mode.
        writeFileSync(opts.out, JSON.stringify({ opts, runs }, null, 2));
        process.stderr.write(
          !run.ok
            ? `FAILED: ${run.error}\n`
            : `${fmt(run.totalTokens)} tok, ${run.numTurns} turns${run.complete ? "" : "  [INCOMPLETE — excluded]"}\n`,
        );
      }
    }
  }

  const failed = runs.filter((r) => !r.ok);
  const incomplete = runs.filter((r) => r.ok && !r.complete);
  const perCase = cases.map((c) => {
    const pick = (arm: Arm, key: keyof Usage) =>
      median(runs.filter((r) => r.complete && r.caseId === c.id && r.arm === arm).map((r) => r[key] as number));
    return {
      id: c.id,
      name: c.name,
      shape: c.shape,
      cli: { totalTokens: pick("cli", "totalTokens"), billable: pick("cli", "billableEquivalent"), cost: pick("cli", "costUsd"), turns: pick("cli", "numTurns") },
      mcp: { totalTokens: pick("mcp", "totalTokens"), billable: pick("mcp", "billableEquivalent"), cost: pick("mcp", "costUsd"), turns: pick("mcp", "numTurns") },
    };
  });

  const lines: string[] = [];
  lines.push(`# Apollo CLI vs MCP — token efficiency`);
  lines.push("");
  lines.push(`Model \`${opts.model}\` · ${opts.reps} reps per arm per case (median reported) · effort ${opts.effort} · $${opts.budget.toFixed(2)} budget cap per run`);
  if (failed.length) lines.push(`\n**${failed.length} run(s) errored or timed out** — see \`${opts.out}\`. Excluded from medians.`);
  if (incomplete.length)
    lines.push(
      `\n**${incomplete.length} run(s) ran but did not complete the task** (failed the case's completion gate — ` +
        `e.g. stopped to ask for confirmation). Excluded from medians; a bailed-out run must never be scored as cheap.`,
    );
  for (const c of cases) {
    for (const arm of ["cli", "mcp"] as Arm[]) {
      const n = runs.filter((r) => r.complete && r.caseId === c.id && r.arm === arm).length;
      if (n < 2) lines.push(`\n> ⚠️ \`${c.id}\` / ${arm}: only ${n} of ${opts.reps} reps completed — median is not meaningful.`);
    }
  }
  lines.push("");
  lines.push(`| Case | Shape | MCP tokens | CLI tokens | CLI saves | MCP turns | CLI turns |`);
  lines.push(`|---|---|---:|---:|---:|---:|---:|`);
  for (const r of perCase) {
    lines.push(
      `| ${r.name} | ${r.shape} | ${fmt(r.mcp.totalTokens)} | ${fmt(r.cli.totalTokens)} | ${pct(savingsPct(r.mcp.totalTokens, r.cli.totalTokens))} | ${fmt(r.mcp.turns)} | ${fmt(r.cli.turns)} |`,
    );
  }

  const perCaseSavings = perCase.map((r) => savingsPct(r.mcp.totalTokens, r.cli.totalTokens));
  const mean = perCaseSavings.reduce((a, b) => a + b, 0) / (perCaseSavings.length || 1);
  const pooledMcp = perCase.reduce((a, r) => a + r.mcp.totalTokens, 0);
  const pooledCli = perCase.reduce((a, r) => a + r.cli.totalTokens, 0);
  const costMcp = perCase.reduce((a, r) => a + r.mcp.cost, 0);
  const costCli = perCase.reduce((a, r) => a + r.cli.cost, 0);

  lines.push("");
  lines.push(`**Average saving (equal-weighted across cases): ${pct(mean)}**`);
  lines.push("");
  lines.push(`Pooled across all cases: ${fmt(pooledMcp)} → ${fmt(pooledCli)} tokens (${pct(savingsPct(pooledMcp, pooledCli))}).`);
  lines.push(
    `Cost-weighted (cache reads at 0.1x): ${pct(savingsPct(perCase.reduce((a, r) => a + r.mcp.billable, 0), perCase.reduce((a, r) => a + r.cli.billable, 0)))} · billed USD: $${costMcp.toFixed(4)} → $${costCli.toFixed(4)} (${pct(savingsPct(costMcp, costCli))}).`,
  );

  const report = lines.join("\n");
  console.log(report);
  writeFileSync(opts.out, JSON.stringify({ opts, perCase, runs, report }, null, 2));
  process.stderr.write(`\nRaw results → ${opts.out}\n`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
