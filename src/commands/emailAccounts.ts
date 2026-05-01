import type { Command } from 'commander';
import { apolloGet } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

interface EmailAccountsListOptions {
  format?: string;
}

export function registerEmailAccounts(program: Command): void {
  const emails = program.command('email-accounts').description('Linked email inboxes used for sequences');

  emails
    .command('list')
    .description("List the team's linked email accounts (use these IDs for sequence add-contacts)")
    .option(...FORMAT_OPTION)
    .action(async (opts: EmailAccountsListOptions) => {
      const data = await apolloGet('/email_accounts');
      print(data, opts.format);
    });
}
