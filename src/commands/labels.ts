import type { Command } from 'commander';
import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

interface LabelCreateOptions {
  name: string;
  modality: string;
  bookOfBusiness?: boolean;
  format?: string;
}

interface LabelUpdateOptions {
  id: string;
  name: string;
  bookOfBusiness?: boolean;
  format?: string;
}

interface LabelRecordsOptions {
  ids: string[];
  names: string[];
  modality: string;
  async?: boolean;
  format?: string;
}

function buildRecordsBody(opts: LabelRecordsOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    entity_ids: opts.ids,
    label_names: opts.names,
    modality: opts.modality,
  };
  if (opts.async) body.async = true;
  return body;
}

export function registerLabels(program: Command): void {
  const labels = program.command('labels').description('Manage lists (labels) of contacts and accounts');

  labels
    .command('list')
    .description("List all lists (labels) in your team's Apollo account")
    .option(...FORMAT_OPTION)
    .action(async (opts: { format?: string }) => {
      const data = await apolloGet('/labels');
      print(data, opts.format);
    });

  labels
    .command('create')
    .description('Create a new list')
    .requiredOption('--name <name>', 'List name (must be unique per modality)')
    .requiredOption('--modality <modality>', 'Record type the list holds: contacts or accounts')
    .option('--book-of-business', 'Mark an account list as a Book of Business list')
    .option(...FORMAT_OPTION)
    .action(async (opts: LabelCreateOptions) => {
      const body: Record<string, unknown> = { name: opts.name, modality: opts.modality };
      if (opts.bookOfBusiness) body.book_of_business = true;
      const data = await apolloRequest('/labels', body);
      print(data, opts.format);
    });

  labels
    .command('update')
    .description('Rename a list by Apollo label ID')
    .requiredOption('--id <id>', 'Apollo label ID')
    .requiredOption('--name <name>', 'New list name')
    .option('--book-of-business', 'Mark an account list as a Book of Business list')
    .option(...FORMAT_OPTION)
    .action(async (opts: LabelUpdateOptions) => {
      const body: Record<string, unknown> = { name: opts.name };
      if (opts.bookOfBusiness) body.book_of_business = true;
      const data = await apolloRequest(`/labels/${opts.id}`, body, 'PATCH');
      print(data, opts.format);
    });

  labels
    .command('add')
    .description('Add contacts/accounts to lists by name (creates missing lists)')
    .requiredOption('--ids <ids...>', 'Apollo contact or account IDs to add')
    .requiredOption('--names <names...>', 'List name(s) to add the records to')
    .requiredOption('--modality <modality>', 'Record type of --ids: contacts or accounts')
    .option('--async', 'Process in the background (for large batches); returns a progress job to poll')
    .option(...FORMAT_OPTION)
    .action(async (opts: LabelRecordsOptions) => {
      const data = await apolloRequest('/labels/add_entity_ids_to_label_names', buildRecordsBody(opts));
      print(data, opts.format);
    });

  labels
    .command('remove')
    .description('Remove contacts/accounts from lists by name')
    .requiredOption('--ids <ids...>', 'Apollo contact or account IDs to remove')
    .requiredOption('--names <names...>', 'List name(s) to remove the records from')
    .requiredOption('--modality <modality>', 'Record type of --ids: contacts or accounts')
    .option('--async', 'Process in the background (for large batches); returns a progress job to poll')
    .option(...FORMAT_OPTION)
    .action(async (opts: LabelRecordsOptions) => {
      const data = await apolloRequest('/labels/remove_entity_ids_from_label_names', buildRecordsBody(opts));
      print(data, opts.format);
    });
}
