import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

const CRED_PATH = join(homedir(), '.config', 'apollo', 'credentials');

// The live suite reuses the OAuth credentials written by `apollo auth login`.
// When absent (e.g. CI, or a logged-out machine) the suite skips instead of failing.
export function hasCredentials(): boolean {
  if (process.env.APOLLO_SKIP_LIVE) return false;
  if (!existsSync(CRED_PATH)) return false;
  try {
    const c: unknown = JSON.parse(readFileSync(CRED_PATH, 'utf8'));
    const token = (c as { access_token?: unknown }).access_token;
    return typeof token === 'string' && token.length > 0;
  } catch {
    return false;
  }
}

// Write tiers are opt-in so live runs never mutate data (or send email) by accident.
export function writesEnabled(): boolean {
  return process.env.APOLLO_LIVE_WRITES === '1' && !!process.env.APOLLO_TEST_TEAM;
}

export function dangerousEnabled(): boolean {
  return process.env.APOLLO_LIVE_DANGEROUS === '1' && !!process.env.APOLLO_TEST_TEAM;
}

export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
  json: unknown;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// Runs the real CLI end-to-end against https://api.apollo.io and parses its JSON output.
// Defaults to `bun run src/index.ts`; override with APOLLO_CLI_CMD (space-separated).
export async function runCli(args: string[]): Promise<CliResult> {
  const withFormat = args.includes('--format') || args.includes('-f')
    ? args
    : [...args, '--format', 'json'];

  const [cmd, ...base] = (process.env.APOLLO_CLI_CMD ?? 'bun run src/index.ts').split(' ');

  try {
    const { stdout, stderr } = await execFileAsync(cmd!, [...base, ...withFormat], {
      cwd: process.cwd(),
      maxBuffer: 20 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr, json: safeJson(stdout) };
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string };
    return {
      code: err.code ?? 1,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      json: safeJson(err.stdout ?? ''),
    };
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
