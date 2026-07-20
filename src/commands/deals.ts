import type { Command } from 'commander';
import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions } from '../utils.js';

const DEALS_BASE = '/opportunities';

interface DealsCreateOptions {
  name: string;
  ownerId?: string;
  accountId?: string;
  amount?: string;
  currency?: string;
  stageId?: string;
  pipelineId?: string;
  closeDate?: string;
  description?: string;
  format?: string;
}

interface DealsSearchOptions {
  query?: string;
  stageId?: string;
  pipelineId?: string;
  accountId?: string;
  ownerId?: string;
  sortBy?: string;
  sortAsc?: boolean;
  page?: string;
  perPage?: string;
  format?: string;
}

interface DealsShowOptions {
  id: string;
  format?: string;
}

interface DealsUpdateOptions {
  id: string;
  name?: string;
  ownerId?: string;
  amount?: string;
  stageId?: string;
  closeDate?: string;
  format?: string;
}

// Maps deals-update CLI options to the PATCH /opportunities/:id request body.
export function buildDealsUpdateBody(opts: DealsUpdateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (opts.name) body.name = opts.name;
  if (opts.ownerId) body.owner_id = opts.ownerId;
  if (opts.amount !== undefined) body.amount = opts.amount;
  if (opts.stageId) body.opportunity_stage_id = opts.stageId;
  if (opts.closeDate) body.closed_date = opts.closeDate;
  return body;
}

export function registerDeals(program: Command): void {
  const deals = program.command('deals').description('Create, search, view, and update deals (opportunities)');

  deals
    .command('create')
    .description('Create a new deal')
    .requiredOption('--name <name>', 'Deal name')
    .option('--owner-id <id>', 'Apollo user ID of deal owner (defaults to authenticated user)')
    .option('--account-id <id>', 'Apollo account ID')
    .option('--amount <amount>', 'Monetary value')
    .option('--currency <code>', 'ISO 4217 currency code (e.g. USD)')
    .option('--stage-id <id>', 'Apollo opportunity stage ID')
    .option('--pipeline-id <id>', 'Apollo opportunity pipeline ID')
    .option('--close-date <date>', 'Expected close date (YYYY-MM-DD)')
    .option('--description <text>', 'Free-form description')
    .option(...FORMAT_OPTION)
    .action(async (opts: DealsCreateOptions) => {
      const body: Record<string, unknown> = { name: opts.name };
      if (opts.ownerId) body.owner_id = opts.ownerId;
      if (opts.accountId) body.account_id = opts.accountId;
      if (opts.amount !== undefined) body.amount = Number(opts.amount);
      if (opts.currency) body.currency_code = opts.currency;
      if (opts.stageId) body.opportunity_stage_id = opts.stageId;
      if (opts.pipelineId) body.opportunity_pipeline_id = opts.pipelineId;
      if (opts.closeDate) body.closed_date = opts.closeDate;
      if (opts.description) body.description = opts.description;
      const data = await apolloRequest(DEALS_BASE, body);
      print(data, opts.format);
    });

  deals
    .command('search')
    .description('Search deals')
    .option('-q, --query <keywords>', 'Free-text search across name/description')
    .option('--stage-id <id>', 'Filter by stage')
    .option('--pipeline-id <id>', 'Filter by pipeline')
    .option('--account-id <id>', 'Filter by account')
    .option('--owner-id <id>', 'Filter by owner')
    .option('--sort-by <field>', 'Sort field (e.g. amount, closed_date, opportunity_updated_at)')
    .option('--sort-asc', 'Sort ascending (default descending)')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: DealsSearchOptions) => {
      const body: Record<string, unknown> = { ...parsePageOptions(opts) };
      if (opts.query) body.q_keywords = opts.query;
      if (opts.stageId) body.opportunity_stage_id = opts.stageId;
      if (opts.pipelineId) body.opportunity_pipeline_id = opts.pipelineId;
      if (opts.accountId) body.account_id = opts.accountId;
      if (opts.ownerId) body.owner_id = opts.ownerId;
      if (opts.sortBy) body.sort_by_field = opts.sortBy;
      if (opts.sortAsc) body.sort_ascending = true;
      const data = await apolloRequest(`${DEALS_BASE}/search`, body);
      print(data, opts.format);
    });

  deals
    .command('show')
    .description('Show a deal by Apollo opportunity ID')
    .requiredOption('--id <id>', 'Apollo opportunity ID')
    .option(...FORMAT_OPTION)
    .action(async (opts: DealsShowOptions) => {
      const data = await apolloGet(`${DEALS_BASE}/${opts.id}`);
      print(data, opts.format);
    });

  deals
    .command('update')
    .description('Update an existing deal by Apollo opportunity ID')
    .requiredOption('--id <id>', 'Apollo opportunity ID')
    .option('--name <name>', 'Deal name')
    .option('--owner-id <id>', 'Apollo user ID of deal owner')
    .option('--amount <amount>', 'Monetary value (no commas or currency symbols)')
    .option('--stage-id <id>', 'Apollo opportunity stage ID — see `deals stages`')
    .option('--close-date <date>', 'Expected close date (YYYY-MM-DD)')
    .option(...FORMAT_OPTION)
    .action(async (opts: DealsUpdateOptions) => {
      const data = await apolloRequest(`${DEALS_BASE}/${opts.id}`, buildDealsUpdateBody(opts), 'PATCH');
      print(data, opts.format);
    });

  deals
    .command('stages')
    .description('List deal stages (returns stage IDs for create/update/search)')
    .option(...FORMAT_OPTION)
    .action(async (opts: { format?: string }) => {
      const data = await apolloGet('/opportunity_stages');
      print(data, opts.format);
    });
}
