#!/usr/bin/env node

import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { setCustomHeaders } from './api.js';
import { registerAuth } from './commands/auth.js';
import { registerPeople } from './commands/people.js';
import { registerCompanies } from './commands/companies.js';
import { registerNews } from './commands/news.js';
import { registerContacts } from './commands/contacts.js';
import { registerAccounts } from './commands/accounts.js';
import { registerDeals } from './commands/deals.js';
import { registerSequences } from './commands/sequences.js';
import { registerCalls } from './commands/calls.js';
import { registerTasks } from './commands/tasks.js';
import { registerUsers } from './commands/users.js';
import { registerEmailAccounts } from './commands/emailAccounts.js';
import { registerUsage } from './commands/usage.js';
import { registerAnalytics } from './commands/analytics.js';
import { registerEmails } from './commands/emails.js';
import { registerLabels } from './commands/labels.js';
import { registerFields } from './commands/fields.js';
import { registerNotes } from './commands/notes.js';
import { registerConversations } from './commands/conversations.js';
import { registerWebhooks } from './commands/webhooks.js';

const program = new Command();

program
  .name('apollo')
  .description('CLI for the Apollo.io API')
  .version(pkg.version)
  .option(
    '--add-header <header...>',
    'Add custom request header(s) in key:value format (repeatable)',
  )
  .hook('preAction', (cmd) => {
    const raw: string[] | undefined = cmd.opts().addHeader;
    if (!raw?.length) return;
    const headers: Record<string, string> = {};
    for (const entry of raw) {
      const colon = entry.indexOf(':');
      if (colon < 1) {
        console.error(`Invalid --add-header value "${entry}": expected key:value`);
        process.exit(1);
      }
      headers[entry.slice(0, colon).trim().toLowerCase()] = entry.slice(colon + 1).trim();
    }
    setCustomHeaders(headers);
  });

registerAccounts(program);
registerAnalytics(program);
registerAuth(program);
registerCalls(program);
registerCompanies(program);
registerContacts(program);
registerConversations(program);
registerDeals(program);
registerEmailAccounts(program);
registerEmails(program);
registerFields(program);
registerLabels(program);
registerNews(program);
registerNotes(program);
registerPeople(program);
registerSequences(program);
registerTasks(program);
registerUsage(program);
registerUsers(program);
registerWebhooks(program);

program.addHelpCommand(false);
program.addCommand(
  new Command('help')
    .argument('[commands...]', 'command path (e.g. people search)')
    .description('Display help for a command')
    .action((cmds: string[]) => {
      let cmd: Command = program;
      for (const name of cmds) {
        const sub = cmd.commands.find((c) => c.name() === name);
        if (!sub) {
          console.error(`Unknown command: ${cmds.join(' ')}`);
          process.exit(1);
        }
        cmd = sub;
      }
      cmd.help();
    })
);

program.parse();
