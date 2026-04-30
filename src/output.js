import { dump } from 'js-yaml';

const VALID_FORMATS = ['json', 'jsonl', 'csv', 'yaml', 'table'];

// Tuple matching Commander's .option(flags, description, default) signature
export const FORMAT_OPTION = ['-f, --format <format>', 'Output format: json, jsonl, csv, yaml, table', 'json'];

function toRows(data) {
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) return [data];
  return [{ value: data }];
}

function allKeys(rows) {
  const seen = new Set();
  for (const row of rows) {
    if (typeof row === 'object' && row !== null) {
      for (const k of Object.keys(row)) seen.add(k);
    }
  }
  return [...seen];
}

function stringify(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = allKeys(rows);
  const escape = (val) => {
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

function toTable(rows) {
  if (!rows.length) return '(no results)';
  const headers = allKeys(rows);
  const colWidths = headers.map(h =>
    rows.reduce((max, r) => Math.max(max, stringify(r[h]).length), h.length)
  );
  const sep = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const fmt = (vals) => '|' + vals.map((v, i) => ` ${v.padEnd(colWidths[i])} `).join('|') + '|';
  return [
    sep,
    fmt(headers),
    sep,
    ...rows.map(r => fmt(headers.map(h => stringify(r[h])))),
    sep,
  ].join('\n');
}

export function print(data, format) {
  if (format && !VALID_FORMATS.includes(format)) {
    console.error(`Error: unknown format "${format}". Valid options: ${VALID_FORMATS.join(', ')}`);
    process.exit(1);
  }

  switch (format) {
    case 'jsonl':
      toRows(data).forEach(row => console.log(JSON.stringify(row)));
      break;
    case 'csv':
      console.log(toCsv(toRows(data)));
      break;
    case 'yaml':
      // YAML dumps the full response as-is (preserving nested structure, unlike csv/table)
      console.log(dump(data));
      break;
    case 'table':
      console.log(toTable(toRows(data)));
      break;
    default:
      console.log(JSON.stringify(data, null, 2));
  }
}
