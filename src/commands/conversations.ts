import type { Command } from 'commander';
import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

interface ConversationsSearchOptions {
  page?: string;
  limit?: string;
  type?: string;
  accountId?: string;
  contactIds?: string[];
  tagIds?: string[];
  trackerIds?: string[];
  organizationIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  format?: string;
}

interface ConversationsIdOptions {
  id: string;
  format?: string;
}

interface ConversationsExportOptions {
  start: string;
  end: string;
  email: string;
  format?: string;
}

// Maps conversations-search CLI options to the /conversations/search request body.
export function buildConversationsSearchBody(opts: ConversationsSearchOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (opts.page !== undefined) body.page = Number(opts.page);
  if (opts.limit !== undefined) body.per_page = Number(opts.limit);
  if (opts.type) body.conversation_type = opts.type;
  if (opts.accountId) body.account_id = opts.accountId;
  if (opts.contactIds) body.contact_ids = opts.contactIds;
  if (opts.tagIds) body.tag_ids = opts.tagIds;
  if (opts.trackerIds) body.tracker_ids = opts.trackerIds;
  if (opts.organizationIds) body.organization_ids = opts.organizationIds;
  if (opts.dateFrom || opts.dateTo) {
    const range: Record<string, string> = {};
    if (opts.dateFrom) range.start = opts.dateFrom;
    if (opts.dateTo) range.end = opts.dateTo;
    body.date_range = range;
  }
  if (opts.sortBy) body.sort_by_field = opts.sortBy;
  return body;
}

export function registerConversations(program: Command): void {
  const conversations = program.command('conversations').description('Search and export recorded conversations (calls and meetings)');

  conversations
    .command('search')
    .description('Search recorded conversations')
    .option('--type <type>', 'Conversation type: video_conference or phone_call')
    .option('--account-id <id>', 'Filter by account')
    .option('--contact-ids <ids...>', 'Filter by contact ID(s)')
    .option('--tag-ids <ids...>', 'Filter by label/tag ID(s)')
    .option('--tracker-ids <ids...>', 'Filter by tracker ID(s)')
    .option('--organization-ids <ids...>', 'Filter by organization ID(s)')
    .option('--date-from <iso>', 'Start of date range (ISO 8601, GMT)')
    .option('--date-to <iso>', 'End of date range (ISO 8601, GMT)')
    .option('--sort-by <field>', 'Sort field')
    .option('--limit <n>', 'Maximum number of results to return')
    .option('--page <n>', 'Page number')
    .option(...FORMAT_OPTION)
    .action(async (opts: ConversationsSearchOptions) => {
      const data = await apolloRequest('/conversations/search', buildConversationsSearchBody(opts));
      print(data, opts.format);
    });

  conversations
    .command('show')
    .description('Get details for a conversation by ID')
    .requiredOption('--id <id>', 'Apollo conversation ID')
    .option(...FORMAT_OPTION)
    .action(async (opts: ConversationsIdOptions) => {
      const data = await apolloGet(`/conversations/${opts.id}`);
      print(data, opts.format);
    });

  conversations
    .command('export')
    .description('Start an export of conversations for a time range')
    .requiredOption('--start <iso>', 'Start of the export time range (ISO 8601, GMT)')
    .requiredOption('--end <iso>', 'End of the export time range (ISO 8601, GMT)')
    .requiredOption('--email <email>', 'Team member email to notify when the export is ready')
    .option(...FORMAT_OPTION)
    .action(async (opts: ConversationsExportOptions) => {
      const data = await apolloRequest('/conversations/export', {
        start_time: opts.start,
        end_time: opts.end,
        email: opts.email,
      });
      print(data, opts.format);
    });

  conversations
    .command('export-status')
    .description('Check the status of a conversations export')
    .requiredOption('--id <id>', 'Export job ID (from `conversations export`)')
    .option(...FORMAT_OPTION)
    .action(async (opts: ConversationsIdOptions) => {
      const data = await apolloGet(`/conversations/export/${opts.id}`);
      print(data, opts.format);
    });
}
