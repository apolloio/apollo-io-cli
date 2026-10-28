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

interface FieldsUpdateOptions {
  id: string;
  label?: string;
  fieldGroupId?: string;
  maxLength?: string;
  metaFile?: string;
  format?: string;
}

// Maps fields-update CLI options (+ an optional parsed --meta-file object) to the PATCH /fields
// request body. The API updates one field per request, wrapped in a `fields` array. Pure.
export function buildFieldsUpdateBody(
  opts: FieldsUpdateOptions,
  meta?: Record<string, unknown>,
): Record<string, unknown> {
  const field: Record<string, unknown> = { id: opts.id };
  if (opts.label) field.label = opts.label;
  if (opts.fieldGroupId) field.field_group_id = opts.fieldGroupId;
  if (opts.maxLength !== undefined) field.meta = { ...meta, max_length: Number(opts.maxLength) };
  else if (meta) field.meta = meta;
  return { fields: [field] };
}

export function registerFields(program: Command): void {
  const fields = program.command('fields').description('List, create, and update fields (including custom fields)');

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
    .command('update')
    .description('Update a custom field: rename it, move it to a field group, or change its settings')
    .requiredOption('--id <id>', 'Field ID as modality.field_id (e.g. contact.694095a80f1b6000110fc556) — see `fields list --source custom`')
    .option('--label <label>', 'New field name')
    .option('--field-group-id <id>', 'Move the field into this field group (folder)')
    .option('--max-length <n>', 'New maximum length (for text fields)')
    .option('--meta-file <path>', 'Path to a JSON file with the field `meta` object (e.g. { "picklist_values": [...] })')
    .option(...FORMAT_OPTION)
    .action(async (opts: FieldsUpdateOptions) => {
      let meta: Record<string, unknown> | undefined;
      if (opts.metaFile) {
        const fs = await import('node:fs/promises');
        const parsed: unknown = JSON.parse(await fs.readFile(opts.metaFile, 'utf8'));
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          console.error('Error: --meta-file must contain a JSON object');
          process.exit(1);
        }
        meta = parsed as Record<string, unknown>;
      }
      const data = await apolloRequest('/fields', buildFieldsUpdateBody(opts, meta), 'PATCH');
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
