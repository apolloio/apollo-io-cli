#!/usr/bin/env node

import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
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

const program = new Command();

program
  .name('apollo')
  .description('CLI for the Apollo.io API')
  .version(pkg.version);

registerAccounts(program);
registerAnalytics(program);
registerAuth(program);
registerCalls(program);
registerCompanies(program);
registerContacts(program);
registerDeals(program);
registerEmailAccounts(program);
registerNews(program);
registerPeople(program);
registerSequences(program);
registerTasks(program);
registerUsage(program);
registerUsers(program);

program.parse();
