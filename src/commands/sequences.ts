import type { Command } from 'commander';
import { apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions } from '../utils.js';

interface SequenceSearchOptions {
  query?: string;
  page?: string;
  perPage?: string;
  format?: string;
}

interface SequenceAddContactsOptions {
  id: string;
  fromEmailAccount: string[];
  contactId?: string[];
  label?: string[];
  fromEmail?: string;
  email?: boolean;
  unverifiedEmail?: boolean;
  jobChange?: boolean;
  activeInOther?: boolean;
  finishedInOther?: boolean;
  sameCompany?: boolean;
  withoutOwnership?: boolean;
  addIfInQueue?: boolean;
  skipVerification?: boolean;
  status?: string;
  autoUnpauseAt?: string;
  format?: string;
}

interface SequenceRemoveContactsOptions {
  contactId: string[];
  sequenceId: string[];
  mode: string;
  reason?: string;
  format?: string;
}

export function registerSequences(program: Command): void {
  const seq = program.command('sequences').description('Search sequences and add or remove contacts');

  seq
    .command('search')
    .description('Search for sequences by name')
    .option('-q, --query <name>', 'Keywords matching part of the sequence name')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: SequenceSearchOptions) => {
      const { page, per_page } = parsePageOptions(opts);
      const body: Record<string, unknown> = { page: String(page), per_page: String(per_page) };
      if (opts.query) body.q_name = opts.query;
      const data = await apolloRequest('/emailer_campaigns/search', body);
      print(data, opts.format);
    });

  seq
    .command('add-contacts')
    .description('Add contacts to a sequence (sends real emails — confirm before running)')
    .requiredOption('--id <id>', 'Sequence ID')
    .requiredOption('--from-email-account <ids...>', 'Email account ID(s) to send from (one or more)')
    .option('--contact-id <ids...>', 'Apollo contact IDs to enroll')
    .option('--label <names...>', 'Label name(s) to identify contacts to enroll')
    .option('--from-email <email>', 'Optional specific sender email address')
    .option('--no-email', 'Add contacts even if they have no email address')
    .option('--unverified-email', 'Add contacts with unverified emails')
    .option('--job-change', 'Add contacts who recently changed jobs')
    .option('--active-in-other', 'Add contacts active in other sequences')
    .option('--finished-in-other', 'Add contacts finished in other sequences')
    .option('--same-company', 'Add contacts from same company already in sequence')
    .option('--without-ownership', 'Bypass ownership permission check')
    .option('--add-if-in-queue', 'Add contacts even if currently queued')
    .option('--skip-verification', 'Skip contact verification')
    .option('--status <status>', 'Initial status: active or paused')
    .option('--auto-unpause-at <iso>', 'ISO 8601 datetime to auto-unpause (with --status paused)')
    .option(...FORMAT_OPTION)
    .action(async (opts: SequenceAddContactsOptions) => {
      if (!opts.contactId && !opts.label) {
        console.error('Error: provide --contact-id or --label');
        process.exit(1);
      }
      const senders = opts.fromEmailAccount;
      const body: Record<string, unknown> = {
        id: opts.id,
        emailer_campaign_id: opts.id,
        send_email_from_email_account_id: senders.length === 1 ? senders[0] : senders,
      };
      if (opts.contactId) body.contact_ids = opts.contactId;
      if (opts.label) body.label_names = opts.label;
      if (opts.fromEmail) body.send_email_from_email_address = opts.fromEmail;
      if (opts.email === false) body.sequence_no_email = true;
      if (opts.unverifiedEmail) body.sequence_unverified_email = true;
      if (opts.jobChange) body.sequence_job_change = true;
      if (opts.activeInOther) body.sequence_active_in_other_campaigns = true;
      if (opts.finishedInOther) body.sequence_finished_in_other_campaigns = true;
      if (opts.sameCompany) body.sequence_same_company_in_same_campaign = true;
      if (opts.withoutOwnership) body.contacts_without_ownership_permission = true;
      if (opts.addIfInQueue) body.add_if_in_queue = true;
      if (opts.skipVerification) body.contact_verification_skipped = true;
      if (opts.status) body.status = opts.status;
      if (opts.autoUnpauseAt) body.auto_unpause_at = opts.autoUnpauseAt;
      const data = await apolloRequest(`/emailer_campaigns/${opts.id}/add_contact_ids`, body);
      print(data, opts.format);
    });

  seq
    .command('remove-contacts')
    .description('Remove or stop contacts in one or more sequences')
    .requiredOption('--contact-id <ids...>', 'Apollo contact IDs')
    .requiredOption('--sequence-id <ids...>', 'Sequence (emailer_campaign) IDs')
    .option('--mode <mode>', 'remove or stop (default: remove)', 'remove')
    .option('--reason <text>', 'Stop reason (used with --mode stop)')
    .option(...FORMAT_OPTION)
    .action(async (opts: SequenceRemoveContactsOptions) => {
      const body: Record<string, unknown> = {
        contact_ids: opts.contactId,
        emailer_campaign_ids: opts.sequenceId,
        mode: opts.mode,
      };
      if (opts.reason) body.stop_reason = opts.reason;
      const data = await apolloRequest('/emailer_campaigns/remove_or_stop_contact_ids', body);
      print(data, opts.format);
    });
}
