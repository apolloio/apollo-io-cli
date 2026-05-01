import type { Command } from 'commander';
import { apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions } from '../utils.js';

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
}
