import type { Command } from 'commander';
import { apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions } from '../utils.js';

interface CallLogOptions {
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  from?: string;
  to?: string;
  start?: string;
  end?: string;
  duration?: string;
  note?: string;
  outcomeId?: string;
  purposeId?: string;
  status?: string;
  callIdentifier?: string;
  format?: string;
}

interface CallSearchOptions {
  query?: string;
  userId?: string;
  contactId?: string;
  accountId?: string;
  sortBy?: string;
  sortAsc?: boolean;
  page?: string;
  perPage?: string;
  format?: string;
}

interface CallUpdateOptions {
  id: string;
  note?: string;
  outcomeId?: string;
  purposeId?: string;
  status?: string;
  contactId?: string;
  format?: string;
}

export function registerCalls(program: Command): void {
  const calls = program.command('calls').description('Log, search, and update phone-call records');

  calls
    .command('log')
    .description('Log a phone-call record')
    .option('--contact-id <id>', 'Apollo contact ID')
    .option('--account-id <id>', 'Apollo account ID')
    .option('--opportunity-id <id>', 'Apollo opportunity ID')
    .option('--from <num>', 'From phone number')
    .option('--to <num>', 'To phone number')
    .option('--start <iso>', 'Start time (ISO 8601)')
    .option('--end <iso>', 'End time (ISO 8601)')
    .option('--duration <seconds>', 'Duration in seconds')
    .option('--note <text>', 'Free-form note')
    .option('--outcome-id <id>', 'Phone call outcome ID')
    .option('--purpose-id <id>', 'Phone call purpose ID')
    .option('--status <status>', 'Call status')
    .option('--call-identifier <id>', 'External identifier (upsert key)')
    .option(...FORMAT_OPTION)
    .action(async (opts: CallLogOptions) => {
      const body: Record<string, unknown> = {};
      if (opts.contactId) body.contact_id = opts.contactId;
      if (opts.accountId) body.account_id = opts.accountId;
      if (opts.opportunityId) body.opportunity_id = opts.opportunityId;
      if (opts.from) body.from_number = opts.from;
      if (opts.to) body.to_number = opts.to;
      if (opts.start) body.start_time = opts.start;
      if (opts.end) body.end_time = opts.end;
      if (opts.duration !== undefined) body.duration = parseInt(opts.duration, 10);
      if (opts.note) body.note = opts.note;
      if (opts.outcomeId) body.phone_call_outcome_id = opts.outcomeId;
      if (opts.purposeId) body.phone_call_purpose_id = opts.purposeId;
      if (opts.status) body.status = opts.status;
      if (opts.callIdentifier) body.call_identifier = opts.callIdentifier;
      const data = await apolloRequest('/phone_calls', body);
      print(data, opts.format);
    });

  calls
    .command('search')
    .description('Search phone-call records')
    .option('-q, --query <keywords>', 'Free-text search across notes')
    .option('--user-id <id>', 'Filter by user')
    .option('--contact-id <id>', 'Filter by contact')
    .option('--account-id <id>', 'Filter by account')
    .option('--sort-by <field>', 'Sort field (e.g. start_time, duration)')
    .option('--sort-asc', 'Sort ascending (default descending)')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: CallSearchOptions) => {
      const body: Record<string, unknown> = { ...parsePageOptions(opts) };
      if (opts.query) body.q_keywords = opts.query;
      if (opts.userId) body.user_id = opts.userId;
      if (opts.contactId) body.contact_id = opts.contactId;
      if (opts.accountId) body.account_id = opts.accountId;
      if (opts.sortBy) body.sort_by_field = opts.sortBy;
      if (opts.sortAsc) body.sort_ascending = true;
      const data = await apolloRequest('/phone_calls/search', body);
      print(data, opts.format);
    });

  calls
    .command('update')
    .description('Update a phone-call record')
    .requiredOption('--id <id>', 'Apollo phone call ID')
    .option('--note <text>', 'Updated note')
    .option('--outcome-id <id>', 'Updated outcome ID')
    .option('--purpose-id <id>', 'Updated purpose ID')
    .option('--status <status>', 'Updated status')
    .option('--contact-id <id>', 'Reassign to a different contact')
    .option(...FORMAT_OPTION)
    .action(async (opts: CallUpdateOptions) => {
      const body: Record<string, unknown> = { id: opts.id };
      if (opts.note) body.note = opts.note;
      if (opts.outcomeId) body.phone_call_outcome_id = opts.outcomeId;
      if (opts.purposeId) body.phone_call_purpose_id = opts.purposeId;
      if (opts.status) body.status = opts.status;
      if (opts.contactId) body.contact_id = opts.contactId;
      const data = await apolloRequest(`/phone_calls/${opts.id}`, body, 'PATCH');
      print(data, opts.format);
    });
}
