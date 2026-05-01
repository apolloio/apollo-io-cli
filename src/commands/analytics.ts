import type { Command } from 'commander';
import { apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

interface AnalyticsReportOptions {
  payload: string;
  format?: string;
}

// Apollo's /reports/sync_report endpoint expects fully-built metric/group_by/filter
// structures (objects, not bare strings) sourced from the team's report_config.
// The MCP server transforms simplified input server-side; the CLI cannot, so this
// command takes a raw payload file and passes it through verbatim.
export function registerAnalytics(program: Command): void {
  const analytics = program.command('analytics').description('Query Apollo sales analytics');

  analytics
    .command('report')
    .description('Run a sync analytics report (raw payload pass-through)')
    .requiredOption('--payload <path>', 'Path to JSON file containing the full sync_report request body')
    .option(...FORMAT_OPTION)
    .action(async (opts: AnalyticsReportOptions) => {
      const fs = await import('node:fs/promises');
      const text = await fs.readFile(opts.payload, 'utf8');
      const body: Record<string, unknown> = JSON.parse(text) as Record<string, unknown>;
      const data = await apolloRequest('/reports/sync_report', body);
      print(data, opts.format);
    });
}
