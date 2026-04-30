import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions } from '../utils.js';

export function registerUsers(program) {
  const users = program.command('users').description('Profile and team-member lookups');

  users
    .command('profile')
    .description('Get the authenticated user\'s profile (and optional credit usage)')
    .option('--credits', 'Include credit usage information')
    .option(...FORMAT_OPTION)
    .action(async (opts) => {
      const params = {};
      if (opts.credits) params.include_credit_usage = true;
      const data = await apolloGet('/users/api_profile', params);
      print(data, opts.format);
    });

  users
    .command('search')
    .description('List or search teammates')
    .option('-q, --query <keywords>', 'Free-text search across name/email/title')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts) => {
      const body = parsePageOptions(opts);
      if (opts.query) body.q_keywords = opts.query;
      const data = await apolloRequest('/users/search', body);
      print(data, opts.format);
    });
}
