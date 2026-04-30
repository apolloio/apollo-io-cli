import { apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

export function registerUsage(program) {
  const usage = program.command('usage').description('Credit usage and rate-limit stats');

  usage
    .command('credits')
    .description('View credit usage stats for the authenticated team')
    .option(...FORMAT_OPTION)
    .action(async (opts) => {
      const data = await apolloRequest('/usage_stats/credit_usage_stats', {});
      print(data, opts.format);
    });
}
