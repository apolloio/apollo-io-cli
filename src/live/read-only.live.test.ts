import { describe, it, expect } from 'vitest';
import { runCli, hasCredentials, isRecord } from './helpers.js';

// Read-only live calls. Zero side effects, safe to run anytime you're logged in.
// The key assertion is exit code 0: the CLI exits 1 on any API error (incl. a 422
// for an unrecognized param), so a clean exit proves the API accepted our request.
describe.skipIf(!hasCredentials())('live: read-only', () => {
  it('people search accepts every new MCP parity filter', async () => {
    const res = await runCli([
      'people', 'search',
      '--title', 'CTO',
      '--include-similar-titles',
      '--email-status', 'verified',
      '--keyword-tags', 'software',
      '--using-all-technology', 'react',
      '--not-using-technology', 'php',
      '--job-locations', 'United States',
      '--num-jobs', '1,100',
      '--job-posted', '2023-01-01,2025-01-01',
      '--per-page', '1',
    ]);
    expect(res.code, res.stderr).toBe(0);
    expect(isRecord(res.json)).toBe(true);
  });

  it('people search --city returns people and respects --per-page', async () => {
    const res = await runCli(['people', 'search', '--city', 'San Francisco', '--per-page', '1']);
    expect(res.code, res.stderr).toBe(0);
    expect(isRecord(res.json) && Array.isArray(res.json.people)).toBeTruthy();
    if (isRecord(res.json) && Array.isArray(res.json.people)) {
      expect(res.json.people.length).toBeLessThanOrEqual(1);
    }
  });

  it('companies search accepts every new MCP parity filter', async () => {
    const res = await runCli([
      'companies', 'search',
      '--domains', 'stripe.com',
      '--name', 'Stripe',
      '--funding-date', '2010-01-01,2025-01-01',
      '--job-locations', 'United States',
      '--num-jobs', '1,500',
      '--job-posted', '2023-01-01,2025-01-01',
      '--per-page', '1',
    ]);
    expect(res.code, res.stderr).toBe(0);
    expect(isRecord(res.json)).toBe(true);
  });

  it('companies enrich returns an organization', async () => {
    const res = await runCli(['companies', 'enrich', '--domain', 'stripe.com']);
    expect(res.code, res.stderr).toBe(0);
    expect(isRecord(res.json) && isRecord(res.json.organization)).toBeTruthy();
  });

  it('sequences schedules is wired (succeeds, or 403 until mcp_sequences is GA)', async () => {
    // The sequence-lifecycle tools are still behind Apollo's mcp_sequences rollout, so a
    // token without that scope gets a clean 403 API_INACCESSIBLE. Either outcome proves the
    // command is wired correctly — a CLI/path bug would look different.
    const res = await runCli(['sequences', 'schedules']);
    const notYetGa = res.code !== 0 && /API_INACCESSIBLE|not accessible/.test(res.stderr);
    expect(res.code === 0 || notYetGa, res.stderr).toBe(true);
  });

  it('email-accounts list succeeds', async () => {
    const res = await runCli(['email-accounts', 'list']);
    expect(res.code, res.stderr).toBe(0);
  });

  it('usage credits succeeds', async () => {
    const res = await runCli(['usage', 'credits']);
    expect(res.code, res.stderr).toBe(0);
  });
});
