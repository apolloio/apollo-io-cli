import type { Command } from 'commander';
import { apolloGet, apolloRequest, type QueryParams } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions, readJsonArrayFile } from '../utils.js';

interface EmailDraftOptions {
  contactId?: string;
  subject?: string;
  bodyHtml?: string;
  bodyFile?: string;
  templateId?: string;
  replyTo?: string;
  taskId?: string;
  tracking?: boolean;
  attachmentIds?: string[];
  recipientsFile?: string;
  format?: string;
}

interface EmailIdOptions {
  id: string;
  format?: string;
}

interface EmailSearchOptions {
  query?: string;
  userIds?: string[];
  stats?: string[];
  replyClasses?: string[];
  emailAccountId?: string;
  sequenceIds?: string[];
  notSequenceIds?: string[];
  dateRangeMode?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  perPage?: string;
  format?: string;
}

export function registerEmails(program: Command): void {
  const emails = program.command('emails').description('Draft, send, and inspect one-off outreach emails');

  emails
    .command('draft')
    .description('Create an email draft for a contact (does not send)')
    .option('--contact-id <id>', 'Apollo contact ID of the recipient (required unless --reply-to is set)')
    .option('--subject <subject>', 'Email subject line')
    .option('--body-html <html>', 'Email body as HTML')
    .option('--body-file <path>', 'Path to a file containing the HTML body (alternative to --body-html)')
    .option('--template-id <id>', 'Apollo email template ID to use')
    .option('--reply-to <messageId>', 'Emailer message ID this draft replies to (contact inferred from parent)')
    .option('--task-id <id>', 'Outreach task ID to associate the draft with')
    .option('--tracking', 'Enable open/click tracking')
    .option('--attachment-ids <ids...>', 'Attachment ID(s) to include')
    .option('--recipients-file <path>', 'Path to JSON array of recipients ({ email, contact_id, recipient_type_cd })')
    .option(...FORMAT_OPTION)
    .action(async (opts: EmailDraftOptions) => {
      if (!opts.contactId && !opts.replyTo) {
        console.error('Error: provide --contact-id or --reply-to');
        process.exit(1);
      }
      const body: Record<string, unknown> = {};
      if (opts.contactId) body.contact_id = opts.contactId;
      if (opts.subject) body.subject = opts.subject;
      if (opts.bodyFile) {
        const fs = await import('node:fs/promises');
        body.body_html = await fs.readFile(opts.bodyFile, 'utf8');
      } else if (opts.bodyHtml) {
        body.body_html = opts.bodyHtml;
      }
      if (opts.templateId) body.emailer_template_id = opts.templateId;
      if (opts.replyTo) body.in_response_to_emailer_message_id = opts.replyTo;
      if (opts.taskId) body.outreach_task_id = opts.taskId;
      if (opts.tracking) body.enable_tracking = true;
      if (opts.attachmentIds) body.attachment_ids = opts.attachmentIds;
      if (opts.recipientsFile) body.recipients = await readJsonArrayFile(opts.recipientsFile, 'recipients');
      const data = await apolloRequest('/emailer_messages', body);
      print(data, opts.format);
    });

  emails
    .command('send')
    .description('Send a drafted email immediately — sends a REAL email')
    .requiredOption('--id <id>', 'Emailer message ID (from `emails draft`)')
    .option(...FORMAT_OPTION)
    .action(async (opts: EmailIdOptions) => {
      const data = await apolloRequest(`/emailer_messages/${opts.id}/send_now`, {});
      print(data, opts.format);
    });

  emails
    .command('status')
    .description('Check the send status of an email')
    .requiredOption('--id <id>', 'Emailer message ID')
    .option(...FORMAT_OPTION)
    .action(async (opts: EmailIdOptions) => {
      const data = await apolloRequest('/emailer_messages/email_send_status', { id: opts.id });
      print(data, opts.format);
    });

  emails
    .command('search')
    .description('Search outreach emails sent by your team')
    .option('-q, --query <keywords>', 'Free-text keyword search')
    .option('--user-ids <ids...>', 'Filter by sender user ID(s)')
    .option('--stats <stats...>', 'Filter by message stat(s) (e.g. delivered opened replied bounced)')
    .option('--reply-classes <classes...>', 'Filter by reply classification(s)')
    .option('--email-account-id <id>', 'Filter by sending email account ID (and aliases)')
    .option('--sequence-ids <ids...>', 'Filter to emails from these sequence ID(s)')
    .option('--not-sequence-ids <ids...>', 'Exclude emails from these sequence ID(s)')
    .option('--date-range-mode <mode>', 'Which timestamp the date range filters on (e.g. due_at)')
    .option('--date-from <iso>', 'Earliest message date (ISO 8601)')
    .option('--date-to <iso>', 'Latest message date (ISO 8601)')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: EmailSearchOptions) => {
      const params: QueryParams = { ...parsePageOptions(opts) };
      if (opts.query) params.q_keywords = opts.query;
      if (opts.userIds) params.user_ids = opts.userIds;
      if (opts.stats) params.emailer_message_stats = opts.stats;
      if (opts.replyClasses) params.emailer_message_reply_classes = opts.replyClasses;
      if (opts.emailAccountId) params.email_account_id_and_aliases = opts.emailAccountId;
      if (opts.sequenceIds) params.emailer_campaign_ids = opts.sequenceIds;
      if (opts.notSequenceIds) params.not_emailer_campaign_ids = opts.notSequenceIds;
      if (opts.dateRangeMode) params.emailer_message_date_range_mode = opts.dateRangeMode;
      if (opts.dateFrom) params['emailer_message_date_range[min]'] = opts.dateFrom;
      if (opts.dateTo) params['emailer_message_date_range[max]'] = opts.dateTo;
      const data = await apolloGet('/emailer_messages/search', params);
      print(data, opts.format);
    });
}
