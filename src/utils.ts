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
