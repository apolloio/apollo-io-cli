#!/usr/bin/env node

import { Command } from 'commander';
import { registerAuth } from './commands/auth.js';
import { registerPeople } from './commands/people.js';
import { registerCompanies } from './commands/companies.js';
import { registerNews } from './commands/news.js';

const program = new Command();

program
  .name('apollo')
  .description('CLI for the Apollo.io API')
  .version('0.1.0');

registerAuth(program);
registerPeople(program);
registerCompanies(program);
registerNews(program);

program.parse();
