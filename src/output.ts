import { dump } from 'js-yaml';
import type { OutputFormat } from './types.js';

const VALID_FORMATS: readonly OutputFormat[] = ['json', 'jsonl', 'csv', 'yaml', 'table'];

export const FORMAT_OPTION = [
  '-f, --format <format>',
  'Output format: json, jsonl, csv, yaml, table',
  'json',
] as const satisfies readonly [string, string, string];

type Row = Record<string, unknown>;

function toRows(data: unknown): Row[] {
  if (Array.isArray(data)) return data as Row[];
  if (typeof data === 'object' && data !== null) return [data as Row];
  return [{ value: data }];
}

function allKeys(rows: Row[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    if (typeof row === 'object' && row !== null) {
      for (const k of Object.keys(row)) seen.add(k);
    }
  }
  return [...seen];
}

function stringify(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function toCsv(rows: Row[]): string {
  if (!rows.length) return '';
  const headers = allKeys(rows);
  const escape = (val: unknown): string => {
    const s = stringify(val);
    return s.includes(',') || s.includes('\r') || s.includes('\n') || s.includes('"')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.map(h => escape(h)).join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\r\n');
}

const MAX_CELL_WIDTH = 50;

function truncate(s: string): string {
  const flat = s.replace(/\r?\n/g, ' ');
  return flat.length > MAX_CELL_WIDTH ? `${flat.slice(0, MAX_CELL_WIDTH - 1)}…` : flat;
}

function toTable(rows: Row[]): string {
  if (!rows.length) return '(no results)';

  // Auto-unwrap single-row API envelope objects (e.g. { total_entries: N, people: [...] })
  if (rows.length === 1) {
    const [envelope] = rows;
    const arrayKey = Object.keys(envelope ?? {}).find(k => {
      const v = envelope?.[k];
      return Array.isArray(v) && v.length > 0 && typeof v[0] === 'object';
    });
    if (arrayKey) rows = envelope![arrayKey] as Row[];
  }

  if (!rows.length) return '(no results)';

  const headers = allKeys(rows);
  const cells = rows.map(r => headers.map(h => truncate(stringify(r[h]))));
  const colWidths = headers.map((h, i) =>
    cells.reduce((max, row) => Math.max(max, (row[i] ?? '').length), h.length)
  );
  const sep = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const fmt = (vals: string[]): string =>
    '|' + vals.map((v, i) => ` ${v.padEnd(colWidths[i] ?? 0)} `).join('|') + '|';
  return [
    sep,
    fmt(headers),
    sep,
    ...cells.map(row => fmt(row)),
    sep,
  ].join('\n');
}

function isOutputFormat(value: string): value is OutputFormat {
  return (VALID_FORMATS as readonly string[]).includes(value);
}

export function print(data: unknown, format: string | undefined): void {
  if (format && !isOutputFormat(format)) {
    console.error(`Error: unknown format "${format}". Valid options: ${VALID_FORMATS.join(', ')}`);
    process.exit(1);
  }

  switch (format as OutputFormat | undefined) {
    case 'jsonl':
      toRows(data).forEach(row => console.log(JSON.stringify(row)));
      break;
    case 'csv':
      console.log(toCsv(toRows(data)));
      break;
    case 'yaml':
      console.log(dump(data));
      break;
    case 'table':
      console.log(toTable(toRows(data)));
      break;
    default:
      console.log(JSON.stringify(data, null, 2));
  }
}
