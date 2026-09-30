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

// POST /fields returns FieldTaxonomy ids ("contact.6a95…"), but typed_custom_fields writes and
// `fields custom` use the bare 24-hex id — a prefixed key is rejected or silently ignored.
// Rewrite custom-field ids to the bare form so create output can be piped straight into a write.
export function withBareCustomFieldIds(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const bare = (field: unknown): unknown => {
    if (!field || typeof field !== 'object') return field;
    const f = field as Record<string, unknown>;
    const match = typeof f.id === 'string' ? /^[^.]+\.([a-f0-9]{24})$/.exec(f.id) : null;
    return match ? { ...f, id: match[1] } : f;
  };
  const d = { ...(data as Record<string, unknown>) };
  if (Array.isArray(d.fields)) d.fields = d.fields.map(bare);
  if (d.field) d.field = bare(d.field);
  return d;
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
      print(withBareCustomFieldIds(data), opts.format);
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
