import { apolloRequest } from '../api.js';
import { print } from '../output.js';
import { parsePageOptions } from '../utils.js';

export function registerNews(program) {
  const news = program.command('news').description('Search news articles');

  news
    .command('search')
    .description('Find news coverage related to a company')
    .option('--company <name>', 'Company name to search news for')
    .option('--id <id>', 'Apollo organization ID to filter by')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .action(async (opts) => {
      if (!opts.company && !opts.id) {
        console.error('Error: provide --company or --id');
        process.exit(1);
      }

      const body = parsePageOptions(opts);

      if (opts.company) body.q_organization_name = opts.company;
      if (opts.id) body.organization_id = opts.id;

      const data = await apolloRequest('/news/search', body);
      print(data);
    });
}
