import type { Command } from 'commander';
import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions, readJsonArrayFile } from '../utils.js';

interface AccountFields {
  name?: string;
  domain?: string;
  phone?: string;
  address?: string;
}

interface AccountCreateOptions extends AccountFields {
  format?: string;
}

interface AccountUpdateOptions extends AccountFields {
  id: string;
  format?: string;
}

interface AccountBulkCreateOptions {
  file: string;
  format?: string;
}

interface AccountSearchOptions {
  query?: string;
  stageIds?: string[];
  labelIds?: string[];
  sortBy?: string;
  sortAsc?: boolean;
  page?: string;
  perPage?: string;
  format?: string;
}

interface AccountShowOptions {
  id: string;
  format?: string;
}

interface AccountBulkUpdateOptions {
  file?: string;
  ids?: string[];
  name?: string;
  ownerId?: string;
  stageId?: string;
  format?: string;
}

interface AccountUpdateOwnersOptions {
  ids: string[];
  ownerId: string;
  format?: string;
}

const FIELDS: Array<[keyof AccountFields, string]> = [
  ['name', 'name'],
  ['domain', 'domain'],
  ['phone', 'phone'],
  ['address', 'raw_address'],
];

function buildBody(opts: AccountFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [optKey, apiKey] of FIELDS) {
    const value = opts[optKey];
    if (value !== undefined) body[apiKey] = value;
  }
  return body;
}

function addAccountOptions(cmd: Command): Command {
  return cmd
    .option('--name <name>', 'Account (company) name')
    .option('--domain <domain>', 'Account domain')
    .option('--phone <phone>', 'Phone number')
    .option('--address <address>', 'Street address');
}

export function registerAccounts(program: Command): void {
  const accounts = program.command('accounts').description('Create and manage accounts (CRM companies) in Apollo');

  addAccountOptions(
    accounts
      .command('create')
      .description('Create a new account')
  )
    .option(...FORMAT_OPTION)
    .action(async (opts: AccountCreateOptions) => {
      const data = await apolloRequest('/accounts', buildBody(opts));
      print(data, opts.format);
    });

  addAccountOptions(
    accounts
      .command('update')
      .description('Update an existing account by Apollo ID')
      .requiredOption('--id <id>', 'Apollo account ID')
  )
    .option(...FORMAT_OPTION)
    .action(async (opts: AccountUpdateOptions) => {
      const data = await apolloRequest(`/accounts/${opts.id}`, buildBody(opts), 'PATCH');
      print(data, opts.format);
    });

  accounts
    .command('bulk-create')
    .description('Create multiple accounts from a JSON file')
    .requiredOption('--file <path>', 'Path to JSON file containing an array of account objects')
    .option(...FORMAT_OPTION)
    .action(async (opts: AccountBulkCreateOptions) => {
      const fs = await import('node:fs/promises');
      const text = await fs.readFile(opts.file, 'utf8');
      const parsed: unknown = JSON.parse(text);
      const arr = Array.isArray(parsed)
        ? parsed
        : (parsed as { accounts?: unknown }).accounts;
      if (!Array.isArray(arr)) {
        console.error('Error: file must contain a JSON array of account objects (or { "accounts": [...] })');
        process.exit(1);
      }
      const data = await apolloRequest('/accounts/bulk_create', { accounts: arr });
      print(data, opts.format);
    });

  accounts
    .command('search')
    .description("Search accounts in your team's Apollo account")
    .option('-q, --query <name>', 'Keywords to match against account names')
    .option('--stage-ids <ids...>', 'Filter by account stage ID(s) — see `accounts stages`')
    .option('--label-ids <ids...>', 'Filter by list (label) ID(s)')
    .option('--sort-by <field>', 'Sort field (account_last_activity_date, account_created_at, account_updated_at)')
    .option('--sort-asc', 'Sort ascending (default descending)')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: AccountSearchOptions) => {
      const body: Record<string, unknown> = { ...parsePageOptions(opts) };
      if (opts.query) body.q_organization_name = opts.query;
      if (opts.stageIds) body.account_stage_ids = opts.stageIds;
      if (opts.labelIds) body.account_label_ids = opts.labelIds;
      if (opts.sortBy) body.sort_by_field = opts.sortBy;
      if (opts.sortAsc) body.sort_ascending = true;
      const data = await apolloRequest('/accounts/search', body);
      print(data, opts.format);
    });

  accounts
    .command('show')
    .description('View a single account by Apollo account ID')
    .requiredOption('--id <id>', 'Apollo account ID')
    .option(...FORMAT_OPTION)
    .action(async (opts: AccountShowOptions) => {
      const data = await apolloGet(`/accounts/${opts.id}`);
      print(data, opts.format);
    });

  accounts
    .command('bulk-update')
    .description('Update multiple accounts — same values via --ids, or per-account values via --file')
    .option('--file <path>', 'Path to JSON file with an array of account objects (each needs "id"), or { "account_attributes": [...] }')
    .option('--ids <ids...>', 'Account IDs to apply the same update to (use with --name/--owner-id/--stage-id)')
    .option('--name <name>', 'Name to apply to all accounts in --ids')
    .option('--owner-id <id>', 'Owner user ID to apply to all accounts in --ids')
    .option('--stage-id <id>', 'Account stage ID to apply to all accounts in --ids')
    .option(...FORMAT_OPTION)
    .action(async (opts: AccountBulkUpdateOptions) => {
      if (!opts.file && !opts.ids) {
        console.error('Error: provide --file or --ids');
        process.exit(1);
      }
      const body: Record<string, unknown> = {};
      if (opts.file) {
        body.account_attributes = await readJsonArrayFile(opts.file, 'account_attributes');
      } else {
        body.account_ids = opts.ids;
        if (opts.name) body.name = opts.name;
        if (opts.ownerId) body.owner_id = opts.ownerId;
        if (opts.stageId) body.account_stage_id = opts.stageId;
      }
      const data = await apolloRequest('/accounts/bulk_update', body);
      print(data, opts.format);
    });

  accounts
    .command('update-owners')
    .description('Assign an owner to multiple accounts')
    .requiredOption('--ids <ids...>', 'Apollo account IDs')
    .requiredOption('--owner-id <id>', 'Apollo user ID of the new owner')
    .option(...FORMAT_OPTION)
    .action(async (opts: AccountUpdateOwnersOptions) => {
      const data = await apolloRequest('/accounts/update_owners', {}, 'POST', {
        account_ids: opts.ids,
        owner_id: opts.ownerId,
      });
      print(data, opts.format);
    });

  accounts
    .command('stages')
    .description('List account stages (returns stage IDs for search/update)')
    .option(...FORMAT_OPTION)
    .action(async (opts: { format?: string }) => {
      const data = await apolloGet('/account_stages');
      print(data, opts.format);
    });
}
