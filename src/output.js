import { dump } from 'js-yaml';

export const FORMAT_OPTION = ['-f, --format <format>', 'Output format: json, jsonl, csv, yaml, table', 'json'];

function toRows(data) {
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) return [data];
  return [{ value: data }];
}

function stringify(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    const s = stringify(val);
    return s.includes(',') || s.includes('\n') || s.includes('"')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\n');
}

function toTable(rows) {
  if (!rows.length) return '(no results)';
  const headers = Object.keys(rows[0]);
  const colWidths = headers.map(h =>
    Math.max(h.length, ...rows.map(r => stringify(r[h]).length))
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

export function print(data, format = 'json') {
  switch (format) {
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
