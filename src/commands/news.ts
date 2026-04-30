import type { Command } from 'commander';
import { apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions } from '../utils.js';

interface NewsSearchOptions {
  company?: string;
  id?: string;
  page?: string;
  perPage?: string;
  format?: string;
}

interface NewsAccountSearchResponse {
  accounts?: Array<{ id?: string }>;
}

export function registerNews(program: Command): void {
  const news = program.command('news').description('Search news articles');

  news
    .command('search')
    .description('Find news coverage related to a company')
    .option('--company <name>', 'Company name to search news for')
    .option('--id <id>', 'Apollo organization ID to filter by')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: NewsSearchOptions) => {
      if (!opts.company && !opts.id) {
        console.error('Error: provide --company or --id');
        process.exit(1);
      }

      const { page, per_page } = parsePageOptions(opts);
      let organizationId = opts.id;

      if (!organizationId) {
        const searchData = await apolloRequest<NewsAccountSearchResponse>('/mixed_companies/search', {
          q_organization_keyword_tags: [opts.company],
          per_page: 1,
          page: 1,
        });
        organizationId = searchData.accounts?.[0]?.id;
        if (!organizationId) {
          console.error(`No company found for name: ${opts.company ?? ''}`);
          process.exit(1);
        }
      }

      const data = await apolloRequest('/news_articles/search', {
        organization_ids: [organizationId],
        page,
        per_page,
      });
      print(data, opts.format);
    });
}
