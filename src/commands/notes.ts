import type { Command } from 'commander';
import { apolloGet, type QueryParams } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

interface NotesListOptions {
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  calendarEventId?: string;
  conversationId?: string;
  conversationIds?: string[];
  contactIds?: string[];
  startDate?: string;
  sortBy?: string;
  sortDirection?: string;
  skip?: string;
  limit?: string;
  format?: string;
}

export function registerNotes(program: Command): void {
  const notes = program.command('notes').description('View notes on CRM records');

  notes
    .command('list')
    .description('List notes, filterable by the record they are attached to')
    .option('--contact-id <id>', 'Filter by contact')
    .option('--account-id <id>', 'Filter by account')
    .option('--opportunity-id <id>', 'Filter by deal')
    .option('--calendar-event-id <id>', 'Filter by calendar event')
    .option('--conversation-id <id>', 'Filter by conversation')
    .option('--conversation-ids <ids...>', 'Filter by multiple conversations')
    .option('--contact-ids <ids...>', 'Filter by multiple contacts')
    .option('--start-date <iso>', 'Only notes created on or after this date (ISO 8601)')
    .option('--sort-by <field>', 'Sort field')
    .option('--sort-direction <dir>', 'Sort direction (asc or desc)')
    .option('--skip <n>', 'Number of notes to skip (offset)')
    .option('--limit <n>', 'Maximum number of notes to return')
    .option(...FORMAT_OPTION)
    .action(async (opts: NotesListOptions) => {
      const params: QueryParams = {};
      if (opts.contactId) params.contact_id = opts.contactId;
      if (opts.accountId) params.account_id = opts.accountId;
      if (opts.opportunityId) params.opportunity_id = opts.opportunityId;
      if (opts.calendarEventId) params.calendar_event_id = opts.calendarEventId;
      if (opts.conversationId) params.conversation_id = opts.conversationId;
      if (opts.conversationIds) params.conversation_ids = opts.conversationIds;
      if (opts.contactIds) params.contact_ids = opts.contactIds;
      if (opts.startDate) params.start_date = opts.startDate;
      if (opts.sortBy) params.sort_by_field = opts.sortBy;
      if (opts.sortDirection) params.sort_direction = opts.sortDirection;
      if (opts.skip !== undefined) params.skip = Number(opts.skip);
      if (opts.limit !== undefined) params.limit = Number(opts.limit);
      const data = await apolloGet('/notes', params);
      print(data, opts.format);
    });
}
