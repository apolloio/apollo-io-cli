import { apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

const FIELDS = [
  ['name', 'name'],
  ['domain', 'domain'],
  ['phone', 'phone'],
  ['address', 'raw_address'],
];

function buildBody(opts) {
  const body = {};
  for (const [optKey, apiKey] of FIELDS) {
    if (opts[optKey] !== undefined) body[apiKey] = opts[optKey];
  }
  return body;
}

function addAccountOptions(cmd) {
  return cmd
    .option('--name <name>', 'Account (company) name')
    .option('--domain <domain>', 'Account domain')
    .option('--phone <phone>', 'Phone number')
    .option('--address <address>', 'Street address');
}

export function registerAccounts(program) {
  const accounts = program.command('accounts').description('Create and manage accounts (CRM companies) in Apollo');

  addAccountOptions(
    accounts
      .command('create')
      .description('Create a new account')
  )
    .option(...FORMAT_OPTION)
    .action(async (opts) => {
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
    .action(async (opts) => {
      const data = await apolloRequest(`/accounts/${opts.id}`, buildBody(opts), 'PATCH');
      print(data, opts.format);
    });

  accounts
    .command('bulk-create')
    .description('Create multiple accounts from a JSON file')
    .requiredOption('--file <path>', 'Path to JSON file containing an array of account objects')
    .option(...FORMAT_OPTION)
    .action(async (opts) => {
      const fs = await import('node:fs/promises');
      const text = await fs.readFile(opts.file, 'utf8');
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.accounts;
      if (!Array.isArray(arr)) {
        console.error('Error: file must contain a JSON array of account objects (or { "accounts": [...] })');
        process.exit(1);
      }
      const data = await apolloRequest('/accounts/bulk_create', { accounts: arr });
      print(data, opts.format);
    });
}
