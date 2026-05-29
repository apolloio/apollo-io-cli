import type { Command } from 'commander';
import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions, parseRange } from '../utils.js';

interface PeopleSearchOptions {
  query?: string;
  title?: string[];
  city?: string[];
  seniority?: string[];
  department?: string[];
  technology?: string[];
  domain?: string[];
  industry?: string[];
  companyLocation?: string[];
  employees?: string;
  hiringFor?: string[];
  revenue?: string;
  funding?: string;
  totalFunding?: string;
  page?: string;
  perPage?: string;
  format?: string;
}

interface PeopleEnrichOptions {
  email?: string;
  linkedin?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  format?: string;
}

interface PeopleBulkEnrichOptions {
  emails: string[];
  format?: string;
}

interface PeopleEmailOptions {
  id: string;
  format?: string;
}

interface PeopleEmployeesOptions {
  name?: string;
  domain?: string;
  linkedin?: string;
  page?: string;
  perPage?: string;
  format?: string;
}

export function registerPeople(program: Command): void {
  const people = program.command('people').description('Search and enrich people');

  people
    .command('search')
    .description("Search for people in Apollo's database")
    .option('-q, --query <query>', 'Name or keyword query')
    .option('--title <titles...>', 'Job title(s) to filter by')
    .option('--city <locations...>', 'Location(s) to filter by')
    .option('--seniority <levels...>', 'Seniority level(s) (e.g. manager director vp c_suite)')
    .option('--department <depts...>', 'Department(s) to filter by (e.g. engineering sales)')
    .option('--technology <techs...>', "Technology UIDs the person's company uses")
    .option('--domain <domains...>', 'Company domain(s) to filter by')
    .option('--industry <tagIds...>', 'Industry tag ID(s) (opaque IDs like 5567cd4773696439b10b0000, not free-text names)')
    .option('--company-location <locations...>', "Filter by the person's company HQ location(s)")
    .option('--employees <range>', 'Company employee range (e.g. "11,50" or "51,200")')
    .option('--hiring-for <titles...>', 'Filter to people whose company is currently hiring for job title(s)')
    .option('--revenue <range>', 'Company revenue range as "min,max" (e.g. "1000000,5000000")')
    .option('--funding <range>', 'Company latest funding amount as "min,max"')
    .option('--total-funding <range>', 'Company total funding raised as "min,max"')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: PeopleSearchOptions) => {
      const body: Record<string, unknown> = { ...parsePageOptions(opts) };

      if (opts.query) body.q_keywords = opts.query;
      if (opts.title) body.person_titles = opts.title;
      if (opts.city) body.person_locations = opts.city;
      if (opts.seniority) body.person_seniorities = opts.seniority;
      if (opts.department) body.person_departments = opts.department;
      if (opts.technology) body.currently_using_any_of_technology_uids = opts.technology;
      if (opts.domain) body.q_organization_domains_list = opts.domain;
      if (opts.industry) body.organization_industry_tag_ids = opts.industry;
      if (opts.companyLocation) body.organization_locations = opts.companyLocation;
      if (opts.employees) body.organization_num_employees_ranges = [opts.employees];
      if (opts.hiringFor) body.q_organization_job_titles = opts.hiringFor;
      if (opts.revenue) body.revenue_range = parseRange(opts.revenue);
      if (opts.funding) body.latest_funding_amount_range = parseRange(opts.funding);
      if (opts.totalFunding) body.total_funding_range = parseRange(opts.totalFunding);

      const data = await apolloRequest('/mixed_people/api_search', body);
      print(data, opts.format);
    });

  people
    .command('enrich')
    .description('Enrich a person profile')
    .option('--email <email>', 'Email address')
    .option('--linkedin <url>', 'LinkedIn profile URL')
    .option('--first-name <name>', 'First name (use with --last-name and --company)')
    .option('--last-name <name>', 'Last name (use with --first-name and --company)')
    .option('--name <name>', 'Full name (use with --company)')
    .option('--company <domain>', 'Company domain (use with --name or --first-name/--last-name)')
    .option(...FORMAT_OPTION)
    .action(async (opts: PeopleEnrichOptions) => {
      if (!opts.email && !opts.linkedin && !opts.firstName && !opts.name) {
        console.error('Error: provide --email, --linkedin, or --name/--first-name with --company');
        process.exit(1);
      }

      const body: Record<string, unknown> = {};
      if (opts.email) body.email = opts.email;
      if (opts.linkedin) body.linkedin_url = opts.linkedin;
      if (opts.firstName) body.first_name = opts.firstName;
      if (opts.lastName) body.last_name = opts.lastName;
      if (opts.name) body.name = opts.name;
      if (opts.company) body.organization_name = opts.company;

      const data = await apolloRequest('/people/match', body);
      print(data, opts.format);
    });

  people
    .command('bulk-enrich')
    .description('Enrich multiple people by email')
    .requiredOption('--emails <emails...>', 'Email addresses to enrich')
    .option(...FORMAT_OPTION)
    .action(async (opts: PeopleBulkEnrichOptions) => {
      const body = { details: opts.emails.map(email => ({ email })) };
      const data = await apolloRequest('/people/bulk_match', body);
      print(data, opts.format);
    });

  people
    .command('email')
    .description('Get the email address for a person by Apollo person ID')
    .requiredOption('--id <id>', 'Apollo person ID')
    .option(...FORMAT_OPTION)
    .action(async (opts: PeopleEmailOptions) => {
      const data = await apolloGet('/people/match', { id: opts.id });
      print(data, opts.format);
    });

  people
    .command('employees')
    .description('Find employees at a company')
    .option('--name <name>', 'Company name')
    .option('--domain <domain>', 'Company domain (e.g. acme.com)')
    .option('--linkedin <url>', 'Company LinkedIn URL')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: PeopleEmployeesOptions) => {
      const body: Record<string, unknown> = { ...parsePageOptions(opts) };

      if (opts.name) body.q_organization_name = opts.name;
      if (opts.domain) body.q_organization_domains_list = [opts.domain];
      if (opts.linkedin) body.organization_linkedin_url = opts.linkedin;

      const data = await apolloRequest('/mixed_people/api_search', body);
      print(data, opts.format);
    });
}
