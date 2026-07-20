import type { Command } from 'commander';
import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions, readJsonArrayFile } from '../utils.js';

interface ContactFields {
  firstName?: string;
  lastName?: string;
  email?: string;
  organization?: string;
  title?: string;
  accountId?: string;
  websiteUrl?: string;
  address?: string;
  directPhone?: string;
  corporatePhone?: string;
  mobilePhone?: string;
  homePhone?: string;
  otherPhone?: string;
  label?: string[];
}

interface ContactCreateOptions extends ContactFields {
  dedupe?: boolean;
  format?: string;
}

interface ContactUpdateOptions extends ContactFields {
  id: string;
  format?: string;
}

interface ContactSearchOptions {
  query?: string;
  sortBy?: string;
  sortAsc?: boolean;
  page?: string;
  perPage?: string;
  format?: string;
}

interface ContactBulkCreateOptions {
  file: string;
  format?: string;
}

interface ContactShowOptions {
  id: string;
  format?: string;
}

interface ContactBulkUpdateOptions {
  file?: string;
  ids?: string[];
  ownerId?: string;
  accountId?: string;
  format?: string;
}

interface ContactUpdateStagesOptions {
  ids: string[];
  stageId: string;
  format?: string;
}

interface ContactUpdateOwnersOptions {
  ids: string[];
  ownerId: string;
  format?: string;
}

const CONTACT_FIELDS: Array<[keyof ContactFields, string]> = [
  ['firstName', 'first_name'],
  ['lastName', 'last_name'],
  ['email', 'email'],
  ['organization', 'organization_name'],
  ['title', 'title'],
  ['accountId', 'account_id'],
  ['websiteUrl', 'website_url'],
  ['address', 'present_raw_address'],
  ['directPhone', 'direct_phone'],
  ['corporatePhone', 'corporate_phone'],
  ['mobilePhone', 'mobile_phone'],
  ['homePhone', 'home_phone'],
  ['otherPhone', 'other_phone'],
];

function buildContactBody(opts: ContactFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [optKey, apiKey] of CONTACT_FIELDS) {
    const value = opts[optKey];
    if (value !== undefined) body[apiKey] = value;
  }
  if (opts.label) body.label_names = opts.label;
  return body;
}

function addContactOptions(cmd: Command): Command {
  return cmd
    .option('--first-name <name>', 'First name')
    .option('--last-name <name>', 'Last name')
    .option('--email <email>', 'Email address')
    .option('--organization <name>', 'Employer (company) name')
    .option('--title <title>', 'Job title')
    .option('--account-id <id>', 'Apollo account ID')
    .option('--website-url <url>', 'Corporate website URL')
    .option('--address <address>', 'Personal location (e.g. "Atlanta, United States")')
    .option('--direct-phone <num>', 'Direct phone')
    .option('--corporate-phone <num>', 'Corporate phone')
    .option('--mobile-phone <num>', 'Mobile phone')
    .option('--home-phone <num>', 'Home phone')
    .option('--other-phone <num>', 'Other phone')
    .option('--label <names...>', 'List name(s) the contact belongs to');
}

export function registerContacts(program: Command): void {
  const contacts = program.command('contacts').description('Create, search, and manage contacts in your Apollo account');

  addContactOptions(
    contacts
      .command('create')
      .description('Create a new contact')
  )
    .option('--dedupe', 'Enable deduplication to avoid duplicate contacts')
    .option(...FORMAT_OPTION)
    .action(async (opts: ContactCreateOptions) => {
      const body = buildContactBody(opts);
      if (opts.dedupe) body.run_dedupe = true;
      const data = await apolloRequest('/contacts', body);
      print(data, opts.format);
    });

  addContactOptions(
    contacts
      .command('update')
      .description('Update an existing contact by Apollo ID')
      .requiredOption('--id <id>', 'Apollo contact ID')
  )
    .option(...FORMAT_OPTION)
    .action(async (opts: ContactUpdateOptions) => {
      const body = buildContactBody(opts);
      const data = await apolloRequest(`/contacts/${opts.id}`, body, 'PATCH');
      print(data, opts.format);
    });

  contacts
    .command('search')
    .description("Search contacts in your team's Apollo account")
    .option('-q, --query <keywords>', 'Free-text search across name/title/employer/email')
    .option('--sort-by <field>', 'Sort field (e.g. contact_last_activity_date, contact_created_at)')
    .option('--sort-asc', 'Sort ascending (default descending)')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: ContactSearchOptions) => {
      const body: Record<string, unknown> = { ...parsePageOptions(opts) };
      if (opts.query) body.q_keywords = opts.query;
      if (opts.sortBy) body.sort_by_field = opts.sortBy;
      if (opts.sortAsc) body.sort_ascending = true;
      const data = await apolloRequest('/contacts/search', body);
      print(data, opts.format);
    });

  contacts
    .command('bulk-create')
    .description('Create multiple contacts from a JSON file')
    .requiredOption('--file <path>', 'Path to JSON file containing an array of contact objects')
    .option(...FORMAT_OPTION)
    .action(async (opts: ContactBulkCreateOptions) => {
      const fs = await import('node:fs/promises');
      const text = await fs.readFile(opts.file, 'utf8');
      const parsed: unknown = JSON.parse(text);
      const arr = Array.isArray(parsed)
        ? parsed
        : (parsed as { contacts?: unknown }).contacts;
      if (!Array.isArray(arr)) {
        console.error('Error: file must contain a JSON array of contact objects (or { "contacts": [...] })');
        process.exit(1);
      }
      const data = await apolloRequest('/contacts/bulk_create', { contacts: arr });
      print(data, opts.format);
    });

  contacts
    .command('show')
    .description('View a single contact by Apollo contact ID')
    .requiredOption('--id <id>', 'Apollo contact ID')
    .option(...FORMAT_OPTION)
    .action(async (opts: ContactShowOptions) => {
      const data = await apolloGet(`/contacts/${opts.id}`);
      print(data, opts.format);
    });

  contacts
    .command('bulk-update')
    .description('Update multiple contacts — same values via --ids, or per-contact values via --file')
    .option('--file <path>', 'Path to JSON file with an array of contact objects (each needs "id"), or { "contact_attributes": [...] }')
    .option('--ids <ids...>', 'Contact IDs to apply the same update to (use with --owner-id/--account-id)')
    .option('--owner-id <id>', 'Owner user ID to apply to all contacts in --ids')
    .option('--account-id <id>', 'Account ID to apply to all contacts in --ids')
    .option(...FORMAT_OPTION)
    .action(async (opts: ContactBulkUpdateOptions) => {
      if (!opts.file && !opts.ids) {
        console.error('Error: provide --file or --ids');
        process.exit(1);
      }
      const body: Record<string, unknown> = {};
      if (opts.file) {
        body.contact_attributes = await readJsonArrayFile(opts.file, 'contact_attributes');
      } else {
        body.contact_ids = opts.ids;
        if (opts.ownerId) body.owner_id = opts.ownerId;
        if (opts.accountId) body.account_id = opts.accountId;
      }
      const data = await apolloRequest('/contacts/bulk_update', body);
      print(data, opts.format);
    });

  contacts
    .command('update-stages')
    .description('Move multiple contacts to a contact stage')
    .requiredOption('--ids <ids...>', 'Apollo contact IDs')
    .requiredOption('--stage-id <id>', 'Target contact stage ID — see `contacts stages`')
    .option(...FORMAT_OPTION)
    .action(async (opts: ContactUpdateStagesOptions) => {
      const data = await apolloRequest('/contacts/update_stages', {}, 'POST', {
        contact_ids: opts.ids,
        contact_stage_id: opts.stageId,
      });
      print(data, opts.format);
    });

  contacts
    .command('update-owners')
    .description('Assign an owner to multiple contacts')
    .requiredOption('--ids <ids...>', 'Apollo contact IDs')
    .requiredOption('--owner-id <id>', 'Apollo user ID of the new owner')
    .option(...FORMAT_OPTION)
    .action(async (opts: ContactUpdateOwnersOptions) => {
      const data = await apolloRequest('/contacts/update_owners', {}, 'POST', {
        contact_ids: opts.ids,
        owner_id: opts.ownerId,
      });
      print(data, opts.format);
    });

  contacts
    .command('stages')
    .description('List contact stages (returns stage IDs for update-stages)')
    .option(...FORMAT_OPTION)
    .action(async (opts: { format?: string }) => {
      const data = await apolloGet('/contact_stages');
      print(data, opts.format);
    });
}
