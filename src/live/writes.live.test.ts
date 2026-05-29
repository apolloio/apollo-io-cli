import { describe, it, expect } from 'vitest';
import { runCli, hasCredentials, writesEnabled, dangerousEnabled } from './helpers.js';

// Write + side-effecting live tests for the sequence-lifecycle commands.
// These mutate data / send email and have no API delete path, so they:
//   - require the opt-in env tiers (writesEnabled / dangerousEnabled + APOLLO_TEST_TEAM)
//   - require operator-supplied fixtures, skipping individually when absent
// Run only against a dedicated throwaway team. See ./README.md.
const stepsFile = process.env.APOLLO_TEST_STEPS_FILE;
const seqId = process.env.APOLLO_TEST_SEQUENCE_ID;
const emailAccountId = process.env.APOLLO_TEST_EMAIL_ACCOUNT_ID;
const contactId = process.env.APOLLO_TEST_CONTACT_ID;

describe.skipIf(!hasCredentials() || !writesEnabled())('live writes: sequences', () => {
  it.skipIf(!stepsFile)('create accepts a steps file', async () => {
    const res = await runCli([
      'sequences', 'create',
      '--name', `cli-live-test ${Date.now()}`,
      '--steps-file', stepsFile!,
    ]);
    expect(res.code, res.stderr).toBe(0);
  });

  it.skipIf(!stepsFile || !seqId)('update replaces steps on an existing sequence', async () => {
    const res = await runCli([
      'sequences', 'update',
      '--id', seqId!,
      '--steps-file', stepsFile!,
    ]);
    expect(res.code, res.stderr).toBe(0);
  });
});

describe.skipIf(!hasCredentials() || !dangerousEnabled())('live side-effecting: sequences', () => {
  it.skipIf(!seqId)('approve activates a sequence', async () => {
    const res = await runCli(['sequences', 'approve', '--id', seqId!]);
    expect(res.code, res.stderr).toBe(0);
  });

  it.skipIf(!seqId || !emailAccountId || !contactId)('add-contacts enrolls a contact (SENDS REAL EMAIL)', async () => {
    const res = await runCli([
      'sequences', 'add-contacts',
      '--id', seqId!,
      '--from-email-account', emailAccountId!,
      '--contact-id', contactId!,
    ]);
    expect(res.code, res.stderr).toBe(0);
  });
});
