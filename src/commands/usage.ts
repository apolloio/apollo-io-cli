import type { Command } from 'commander';
import { apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

interface UsageCreditsOptions {
  format?: string;
}

export function registerUsage(program: Command): void {
  const usage = program.command('usage').description('Credit usage and rate-limit stats');

  usage
    .command('credits')
    .description('View credit usage stats for the authenticated team')
    .option(...FORMAT_OPTION)
    .action(async (opts: UsageCreditsOptions) => {
      const data = await apolloRequest('/usage_stats/credit_usage_stats', {});
      print(data, opts.format);
    });

  usage
    .command('api')
    .description('View API usage stats and rate limits per endpoint')
    .option(...FORMAT_OPTION)
    .action(async (opts: UsageCreditsOptions) => {
      const data = await apolloRequest('/usage_stats/api_usage_stats', {});
      print(data, opts.format);
    });
}
