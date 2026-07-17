import type { Command } from 'commander';
import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

interface FieldsListOptions {
  source?: string;
  format?: string;
}

interface FieldsCreateOptions {
  label: string;
  modality: string;
  type: string;
  maxLength?: string;
  format?: string;
}

export function registerFields(program: Command): void {
  const fields = program.command('fields').description('List and create fields (including custom fields)');

  fields
    .command('list')
    .description('List all fields available in your Apollo account')
    .option('--source <source>', 'Filter by field source')
    .option(...FORMAT_OPTION)
    .action(async (opts: FieldsListOptions) => {
      const data = await apolloGet('/fields', opts.source ? { source: opts.source } : {});
      print(data, opts.format);
    });

  fields
    .command('create')
    .description('Create a custom field')
    .requiredOption('--label <label>', 'Custom field name')
    .requiredOption('--modality <modality>', 'Record type: contact, account, or opportunity')
    .requiredOption('--type <type>', 'Field type: string, textarea, number, date, datetime, or boolean')
    .option('--max-length <n>', 'Maximum length (for text fields)')
    .option(...FORMAT_OPTION)
    .action(async (opts: FieldsCreateOptions) => {
      const body: Record<string, unknown> = {
        label: opts.label,
        modality: opts.modality,
        type: opts.type,
      };
      if (opts.maxLength !== undefined) body.meta = { max_length: Number(opts.maxLength) };
      const data = await apolloRequest('/fields', body);
      print(data, opts.format);
    });

  fields
    .command('custom')
    .description('List all custom (typed) fields')
    .option(...FORMAT_OPTION)
    .action(async (opts: { format?: string }) => {
      const data = await apolloGet('/typed_custom_fields');
      print(data, opts.format);
    });
}
