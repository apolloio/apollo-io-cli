import type { Command } from 'commander';
import { apolloGet, apolloRequest, type QueryParams } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions } from '../utils.js';

interface TaskCreateOptions {
  userId: string;
  type: string;
  creatorId?: string;
  title?: string;
  note?: string;
  priority?: string;
  status?: string;
  dueAt?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  format?: string;
}

interface TaskBulkCreateOptions {
  file: string;
  format?: string;
}

interface TaskSearchOptions {
  query?: string;
  userId?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  priority?: string;
  sortBy?: string;
  sortAsc?: boolean;
  page?: string;
  perPage?: string;
  format?: string;
}

const TASK_OPT_TO_API: Array<[keyof TaskCreateOptions, string]> = [
  ['userId', 'user_id'],
  ['creatorId', 'creator_id'],
  ['type', 'type'],
  ['title', 'title'],
  ['note', 'note'],
  ['priority', 'priority'],
  ['status', 'status'],
  ['dueAt', 'due_at'],
  ['contactId', 'contact_id'],
  ['accountId', 'account_id'],
  ['opportunityId', 'opportunity_id'],
];

export function registerTasks(program: Command): void {
  const tasks = program.command('tasks').description('Create, search, and bulk-create tasks');

  tasks
    .command('create')
    .description('Create a single task')
    .requiredOption('--user-id <id>', 'Assignee Apollo user ID')
    .requiredOption('--type <type>', 'Task type (e.g. action_item, call, linkedin_step_message)')
    .option('--creator-id <id>', 'Creator user ID (defaults to authenticated user)')
    .option('--title <title>', 'Short title')
    .option('--note <text>', 'Free-form note/body')
    .option('--priority <priority>', 'low, medium, or high')
    .option('--status <status>', 'e.g. scheduled, completed')
    .option('--due-at <iso>', 'Due ISO 8601 timestamp')
    .option('--contact-id <id>', 'Associated contact')
    .option('--account-id <id>', 'Associated account')
    .option('--opportunity-id <id>', 'Associated deal')
    .option(...FORMAT_OPTION)
    .action(async (opts: TaskCreateOptions) => {
      const body: Record<string, unknown> = {};
      for (const [optKey, apiKey] of TASK_OPT_TO_API) {
        const value = opts[optKey];
        if (value !== undefined) body[apiKey] = value;
      }
      const data = await apolloRequest('/tasks', body);
      print(data, opts.format);
    });

  tasks
    .command('bulk-create')
    .description('Create multiple tasks from a JSON file')
    .requiredOption('--file <path>', 'Path to JSON file containing an array of task objects')
    .option(...FORMAT_OPTION)
    .action(async (opts: TaskBulkCreateOptions) => {
      const fs = await import('node:fs/promises');
      const text = await fs.readFile(opts.file, 'utf8');
      const parsed: unknown = JSON.parse(text);
      const arr = Array.isArray(parsed)
        ? parsed
        : (parsed as { tasks_attributes?: unknown }).tasks_attributes;
      if (!Array.isArray(arr)) {
        console.error('Error: file must contain a JSON array of task objects (or { "tasks_attributes": [...] })');
        process.exit(1);
      }
      const data = await apolloRequest('/tasks/bulk_create', { tasks_attributes: arr });
      print(data, opts.format);
    });

  tasks
    .command('search')
    .description('Search tasks')
    .option('-q, --query <keywords>', 'Free-text search across title and note')
    .option('--user-id <id>', 'Filter by assignee')
    .option('--contact-id <id>', 'Filter by contact')
    .option('--account-id <id>', 'Filter by account')
    .option('--opportunity-id <id>', 'Filter by deal')
    .option('--priority <p>', 'Filter by priority (low/medium/high)')
    .option('--sort-by <field>', 'Sort field (e.g. due_at, task_priority)')
    .option('--sort-asc', 'Sort ascending (default descending)')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: TaskSearchOptions) => {
      const body: QueryParams = { ...parsePageOptions(opts) };
      if (opts.query) body.q_keywords = opts.query;
      if (opts.userId) body.user_id = opts.userId;
      if (opts.contactId) body.contact_id = opts.contactId;
      if (opts.accountId) body.account_id = opts.accountId;
      if (opts.opportunityId) body.opportunity_id = opts.opportunityId;
      if (opts.priority) body.priority = opts.priority;
      if (opts.sortBy) body.sort_by_field = opts.sortBy;
      if (opts.sortAsc) body.sort_ascending = true;
      const data = await apolloGet('/tasks/search', body);
      print(data, opts.format);
    });
}
