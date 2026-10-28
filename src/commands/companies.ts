import type { Command } from 'commander';
import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions, parseRange } from '../utils.js';

interface CompaniesSearchOptions {
  query?: string;
  name?: string;
  domains?: string[];
  notDomains?: string[];
  organizationIds?: string[];
  lookalikeIds?: string[];
  location?: string[];
  notLocation?: string[];
  employees?: string;
  headcountGrowth?: string;
  headcountGrowthMonths?: string;
  industry?: string[];
  notKeywordTags?: string[];
  industryIds?: string[];
  notIndustryIds?: string[];
  industryName?: string[];
  naics?: string[];
  notNaics?: string[];
  sic?: string[];
  notSic?: string[];
  technology?: string[];
  revenue?: string;
  funding?: string;
  fundingDate?: string;
  totalFunding?: string;
  hiringFor?: string[];
  jobLocations?: string[];
  numJobs?: string;
  jobPosted?: string;
  page?: string;
  perPage?: string;
  format?: string;
}

interface CompaniesEnrichOptions {
  domain?: string;
  name?: string;
  format?: string;
}

interface CompaniesBulkEnrichOptions {
  domains: string[];
  format?: string;
}

interface CompaniesGetOptions {
  id: string;
  format?: string;
}

interface CompaniesJobsOptions {
  id: string;
  page?: string;
  perPage?: string;
  format?: string;
}

interface AccountRecord {
  id?: string;
  primary_domain?: string;
  domain?: string;
  [key: string]: unknown;
}

interface CompaniesSearchResponse {
  accounts?: AccountRecord[];
}

// Maps companies-search CLI options to the /mixed_companies/search request body.
// Pure (no paging/IO) so it can be unit-tested directly.
export function buildCompaniesSearchBody(opts: CompaniesSearchOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (opts.industry) body.q_organization_keyword_tags = opts.industry;
  else if (opts.query) body.q_organization_keyword_tags = [opts.query];
  if (opts.notKeywordTags) body.q_not_organization_keyword_tags = opts.notKeywordTags;
  if (opts.industryIds) body.organization_industry_tag_ids = opts.industryIds;
  if (opts.notIndustryIds) body.organization_not_industry_tag_ids = opts.notIndustryIds;
  if (opts.industryName) body.organization_industries = opts.industryName;
  if (opts.naics) body.organization_naics_codes = opts.naics;
  if (opts.notNaics) body.not_organization_naics_codes = opts.notNaics;
  if (opts.sic) body.organization_sic_codes = opts.sic;
  if (opts.notSic) body.not_organization_sic_codes = opts.notSic;
  if (opts.name) body.q_organization_name = opts.name;
  if (opts.domains) body.q_organization_domains_list = opts.domains;
  if (opts.notDomains) body.not_organization_websites_list = opts.notDomains;
  if (opts.organizationIds) body.organization_ids = opts.organizationIds;
  if (opts.lookalikeIds) body.lookalike_organization_ids = opts.lookalikeIds;
  if (opts.location) body.organization_locations = opts.location;
  if (opts.notLocation) body.organization_not_locations = opts.notLocation;
  if (opts.employees) body.organization_num_employees_ranges = [opts.employees];
  if (opts.headcountGrowth) body.organization_headcount_growth_range = parseRange(opts.headcountGrowth);
  if (opts.headcountGrowthMonths) body.organization_headcount_growth_past_n_months = Number(opts.headcountGrowthMonths);
  if (opts.technology) body.currently_using_any_of_technology_uids = opts.technology;
  if (opts.revenue) body.revenue_range = parseRange(opts.revenue);
  if (opts.funding) body.latest_funding_amount_range = parseRange(opts.funding);
  if (opts.fundingDate) body.latest_funding_date_range = parseRange(opts.fundingDate);
  if (opts.totalFunding) body.total_funding_range = parseRange(opts.totalFunding);
  if (opts.hiringFor) body.q_organization_job_titles = opts.hiringFor;
  if (opts.jobLocations) body.organization_job_locations = opts.jobLocations;
  if (opts.numJobs) body.organization_num_jobs_range = parseRange(opts.numJobs);
  if (opts.jobPosted) body.organization_job_posted_at_range = parseRange(opts.jobPosted);

  return body;
}

export function registerCompanies(program: Command): void {
  const companies = program.command('companies').description('Search and enrich companies');

  companies
    .command('search')
    .description("Search for companies in Apollo's database")
    .option('-q, --query <query>', 'Keyword query')
    .option('--name <name>', 'Filter by organization name')
    .option('--domains <domains...>', 'Company domain(s) to filter by')
    .option('--not-domains <domains...>', 'Company domain(s) to exclude')
    .option('--organization-ids <ids...>', 'Apollo organization ID(s) to restrict to')
    .option('--lookalike-ids <ids...>', 'Apollo organization ID(s) to use as lookalike seeds (results ranked by similarity)')
    .option('--location <locations...>', 'Location(s) to filter by')
    .option('--not-location <locations...>', 'Location(s) to exclude')
    .option('--employees <range>', 'Employee range (e.g. "1,10" or "11,50")')
    .option('--headcount-growth <range>', 'Headcount growth in percent as "min,max" (e.g. "10,100"; requires --headcount-growth-months)')
    .option('--headcount-growth-months <n>', 'Window for --headcount-growth: 6, 12, or 24 months')
    .option('--industry <tags...>', 'Industry keyword tag(s)')
    .option('--not-keyword-tags <tags...>', 'Exclude companies with any of these keyword tag(s)')
    .option('--industry-ids <tagIds...>', 'Industry tag ID(s) (opaque IDs like 5567cd4773696439b10b0000)')
    .option('--not-industry-ids <tagIds...>', 'Exclude companies in these industry tag ID(s)')
    .option('--industry-name <names...>', 'Industry name(s), exact Apollo spelling (e.g. "information technology & services")')
    .option('--naics <codes...>', 'NAICS code(s), prefix or range match (e.g. 5415 or 31-33)')
    .option('--not-naics <codes...>', 'Exclude companies with these NAICS code(s)')
    .option('--sic <codes...>', 'SIC code(s), prefix match (e.g. 7372)')
    .option('--not-sic <codes...>', 'Exclude companies with these SIC code(s)')
    .option('--technology <techs...>', 'Technology UIDs in use')
    .option('--revenue <range>', 'Revenue range as "min,max" (e.g. "1000000,5000000")')
    .option('--funding <range>', 'Latest funding amount as "min,max"')
    .option('--funding-date <range>', 'Latest funding date range as "min,max" (ISO dates)')
    .option('--total-funding <range>', 'Total funding raised as "min,max"')
    .option('--hiring-for <titles...>', 'Currently hiring for job title(s)')
    .option('--job-locations <locations...>', 'Locations the company is hiring in')
    .option('--num-jobs <range>', 'Number of open jobs as "min,max"')
    .option('--job-posted <range>', 'Job-posting date range as "min,max" (ISO dates)')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: CompaniesSearchOptions) => {
      const body = { ...parsePageOptions(opts), ...buildCompaniesSearchBody(opts) };
      const data = await apolloRequest('/mixed_companies/search', body);
      print(data, opts.format);
    });

  companies
    .command('enrich')
    .description('Enrich a company profile')
    .option('--domain <domain>', 'Company domain (e.g. acme.com)')
    .option('--name <name>', 'Company name')
    .option(...FORMAT_OPTION)
    .action(async (opts: CompaniesEnrichOptions) => {
      if (!opts.domain && !opts.name) {
        console.error('Error: provide --domain or --name');
        process.exit(1);
      }

      if (!opts.domain && opts.name) {
        const searchData = await apolloRequest<CompaniesSearchResponse>('/mixed_companies/search', {
          q_organization_keyword_tags: [opts.name],
          per_page: 1,
          page: 1,
        });
        const account = searchData.accounts?.[0];
        if (!account) {
          console.error(`No company found for name: ${opts.name}`);
          process.exit(1);
        }
        const domain = account.primary_domain ?? account.domain;
        if (!domain) {
          console.error(`No domain found for company: ${opts.name}`);
          process.exit(1);
        }
        const data = await apolloRequest('/organizations/enrich', { domain });
        print(data, opts.format);
        return;
      }

      const body: Record<string, unknown> = {};
      if (opts.domain) body.domain = opts.domain;
      if (opts.name) body.name = opts.name;

      const data = await apolloRequest('/organizations/enrich', body);
      print(data, opts.format);
    });

  companies
    .command('bulk-enrich')
    .description('Enrich multiple companies by domain')
    .requiredOption('--domains <domains...>', 'Company domains to enrich')
    .option(...FORMAT_OPTION)
    .action(async (opts: CompaniesBulkEnrichOptions) => {
      const body = { domains: opts.domains };
      const data = await apolloRequest('/organizations/bulk_enrich', body);
      print(data, opts.format);
    });

  companies
    .command('get')
    .description('Get complete organization info by Apollo organization ID')
    .requiredOption('--id <id>', 'Apollo organization ID')
    .option(...FORMAT_OPTION)
    .action(async (opts: CompaniesGetOptions) => {
      const data = await apolloGet(`/organizations/${opts.id}`);
      print(data, opts.format);
    });

  companies
    .command('jobs')
    .description('Get job postings for a company')
    .requiredOption('--id <id>', 'Apollo organization ID')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: CompaniesJobsOptions) => {
      const { page, per_page } = parsePageOptions(opts);
      const data = await apolloGet(`/organizations/${opts.id}/job_postings`, { page, per_page });
      print(data, opts.format);
    });
}
