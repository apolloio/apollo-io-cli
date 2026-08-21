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
 *   --cases <ids>     comma-separated case ids to run (default: all)
 *   --max-turns <n>   turn cap per run (default 30)
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
};

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

type Run = Usage & { arm: Arm; caseId: string; rep: number; ok: boolean; error?: string };

function parseArgs(argv: string[]) {
  const opts = {
    reps: 3,
    model: "claude-sonnet-5",
    cases: [] as string[],
    maxTurns: 30,
    keep: false,
    out: join(HERE, "results.json"),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--reps") opts.reps = Number(argv[++i]);
    else if (a === "--model") opts.model = argv[++i];
    else if (a === "--cases") opts.cases = argv[++i].split(",").map((s) => s.trim());
    else if (a === "--max-turns") opts.maxTurns = Number(argv[++i]);
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
      "--allowedTools",
      "Bash,Skill,Read",
    ];
  }
  return [
    "--strict-mcp-config",
    "--mcp-config",
    JSON.stringify({ mcpServers: { "apollo-work": { type: "http", url: APOLLO_WORK_MCP_URL } } }),
    // Bash denied so the MCP arm cannot quietly shell out to the CLI and win on its behalf.
    "--allowedTools",
    "mcp__apollo-work,Read",
    "--disallowedTools",
    "Bash",
  ];
}

function claude(arm: Arm, c: Case, opts: ReturnType<typeof parseArgs>): Promise<Run> {
  const cwd = makeWorkspace(arm);
  const args = [
    "-p",
    c.prompt,
    "--output-format",
    "json",
    "--model",
    opts.model,
    "--max-turns",
    String(opts.maxTurns),
    "--permission-mode",
    "acceptEdits",
    // An empty settings object keeps the user's global settings, plugins and enabled
    // MCP servers out of both arms.
    "--settings",
    JSON.stringify({}),
    ...armFlags(arm),
  ];

  return new Promise((resolveRun) => {
    const child = spawn("claude", args, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", () => {
      if (!opts.keep) rmSync(cwd, { recursive: true, force: true });
      resolveRun(parseResult(stdout, stderr, arm, c.id, cwd));
    });
  });
}

function parseResult(stdout: string, stderr: string, arm: Arm, caseId: string, cwd: string): Run {
  const empty: Run = {
    arm,
    caseId,
    rep: 0,
    ok: false,
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

  const u = parsed.usage ?? {};
  const inputTokens = u.input_tokens ?? 0;
  const cacheCreationTokens = u.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = u.cache_read_input_tokens ?? 0;
  const outputTokens = u.output_tokens ?? 0;
  return {
    arm,
    caseId,
    rep: 0,
    ok: true,
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
    for (const arm of ["cli", "mcp"] as Arm[]) {
      for (let rep = 1; rep <= opts.reps; rep++) {
        process.stderr.write(`→ ${c.id} / ${arm} / rep ${rep}/${opts.reps} … `);
        const run = await claude(arm, c, opts);
        run.rep = rep;
        runs.push(run);
        process.stderr.write(run.ok ? `${fmt(run.totalTokens)} tok, ${run.numTurns} turns\n` : `FAILED: ${run.error}\n`);
      }
    }
  }

  const failed = runs.filter((r) => !r.ok);
  const perCase = cases.map((c) => {
    const pick = (arm: Arm, key: keyof Usage) =>
      median(runs.filter((r) => r.ok && r.caseId === c.id && r.arm === arm).map((r) => r[key] as number));
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
  lines.push(`Model \`${opts.model}\` · ${opts.reps} reps per arm per case (median reported) · turn cap ${opts.maxTurns}`);
  if (failed.length) lines.push(`\n**${failed.length} run(s) failed** — see \`${opts.out}\`. Medians below exclude them.`);
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
