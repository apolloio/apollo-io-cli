import type { PageOptions } from './types.js';

export interface PageOptionInput {
  page?: string;
  perPage?: string;
}

export function parsePageOptions(opts: PageOptionInput): PageOptions {
  const page = parseInt(opts.page ?? '', 10);
  const per_page = parseInt(opts.perPage ?? '', 10);

  if (isNaN(page) || page < 1) {
    console.error('Error: --page must be a positive integer');
    process.exit(1);
  }
  if (isNaN(per_page) || per_page < 1) {
    console.error('Error: --per-page must be a positive integer');
    process.exit(1);
  }

  return { page, per_page };
}

export function parseRange(input: string): { min: string; max: string } {
  const [min, max] = input.split(',');
  return { min: min ?? '', max: max ?? '' };
}

// Parses "department:min,max" entries (e.g. "master_sales:0,2") into the
// { [department]: { min, max } } shape organization_department_or_subdepartment_counts expects.
export function parseDepartmentHeadcounts(entries: string[]): Record<string, { min: string; max: string }> {
  const result: Record<string, { min: string; max: string }> = {};
  for (const entry of entries) {
    const [department, range] = entry.split(':');
    if (!department || !range) {
      console.error(`Error: invalid --department-headcount "${entry}", expected "department:min,max"`);
      process.exit(1);
    }
    result[department] = parseRange(range);
  }
  return result;
}

// Reads a JSON file that contains either a bare array or `{ "<wrapperKey>": [...] }`.
export async function readJsonArrayFile(path: string, wrapperKey: string): Promise<unknown[]> {
  const fs = await import('node:fs/promises');
  const text = await fs.readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(text);
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>)[wrapperKey];
  if (!Array.isArray(arr)) {
    console.error(`Error: file must contain a JSON array (or { "${wrapperKey}": [...] })`);
    process.exit(1);
  }
  return arr;
}
