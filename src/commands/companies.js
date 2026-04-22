import { apolloGet, apolloRequest } from '../api.js';
import { print } from '../output.js';
import { parsePageOptions } from '../utils.js';

export function registerCompanies(program) {
  const companies = program.command('companies').description('Search and enrich companies');

  companies
    .command('search')
    .description('Search for companies in Apollo\'s database')
    .option('-q, --query <query>', 'Keyword query')
    .option('--location <locations...>', 'Location(s) to filter by')
    .option('--not-location <locations...>', 'Location(s) to exclude')
    .option('--employees <range>', 'Employee range (e.g. "1,10" or "11,50")')
    .option('--industry <tags...>', 'Industry keyword tag(s)')
    .option('--technology <techs...>', 'Technology UIDs in use')
    .option('--revenue <range>', 'Revenue range as "min,max" (e.g. "1000000,5000000")')
    .option('--funding <range>', 'Latest funding amount as "min,max"')
    .option('--total-funding <range>', 'Total funding raised as "min,max"')
    .option('--hiring-for <titles...>', 'Currently hiring for job title(s)')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .action(async (opts) => {
      const body = parsePageOptions(opts);

      if (opts.query) body.q_organization_keyword_tags = [opts.query];
      if (opts.location) body.organization_locations = opts.location;
      if (opts.notLocation) body.organization_not_locations = opts.notLocation;
      if (opts.employees) body.organization_num_employees_ranges = [opts.employees];
      if (opts.industry) body.q_organization_keyword_tags = opts.industry;
      if (opts.technology) body.currently_using_any_of_technology_uids = opts.technology;
      if (opts.revenue) {
        const [min, max] = opts.revenue.split(',');
        body.revenue_range = { min, max };
      }
      if (opts.funding) {
        const [min, max] = opts.funding.split(',');
        body.latest_funding_amount_range = { min, max };
      }
      if (opts.totalFunding) {
        const [min, max] = opts.totalFunding.split(',');
        body.total_funding_range = { min, max };
      }
      if (opts.hiringFor) body.q_organization_job_titles = opts.hiringFor;

      const data = await apolloRequest('/mixed_companies/search', body);
      print(data);
    });

  companies
    .command('enrich')
    .description('Enrich a company profile')
    .option('--domain <domain>', 'Company domain (e.g. acme.com)')
    .option('--name <name>', 'Company name')
    .action(async (opts) => {
      if (!opts.domain && !opts.name) {
        console.error('Error: provide --domain or --name');
        process.exit(1);
      }

      if (!opts.domain && opts.name) {
        const searchData = await apolloRequest('/mixed_companies/search', {
          q_organization_keyword_tags: [opts.name],
          per_page: 1,
          page: 1,
        });
        const account = searchData.accounts?.[0];
        if (!account) {
          console.error(`No company found for name: ${opts.name}`);
          process.exit(1);
        }
        const domain = account.primary_domain || account.domain;
        if (!domain) {
          console.error(`No domain found for company: ${opts.name}`);
          process.exit(1);
        }
        const data = await apolloRequest('/organizations/enrich', { domain });
        print(data);
        return;
      }

      const body = {};
      if (opts.domain) body.domain = opts.domain;
      if (opts.name) body.name = opts.name;

      const data = await apolloRequest('/organizations/enrich', body);
      print(data);
    });

  companies
    .command('bulk-enrich')
    .description('Enrich multiple companies by domain')
    .requiredOption('--domains <domains...>', 'Company domains to enrich')
    .action(async (opts) => {
      const body = { domains: opts.domains };
      const data = await apolloRequest('/organizations/bulk_enrich', body);
      print(data);
    });

  companies
    .command('get')
    .description('Get full details for a company by ID')
    .requiredOption('--id <id>', 'Apollo organization ID')
    .action(async (opts) => {
      const data = await apolloRequest('/mixed_companies/search', {
        organization_ids: [opts.id],
        per_page: 1,
        page: 1,
      });
      print(data);
    });

  companies
    .command('jobs')
    .description('Get job postings for a company')
    .requiredOption('--id <id>', 'Apollo organization ID')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .action(async (opts) => {
      const { page, per_page } = parsePageOptions(opts);
      const data = await apolloGet(`/organizations/${opts.id}/job_postings`, { page, per_page });
      print(data);
    });
}
