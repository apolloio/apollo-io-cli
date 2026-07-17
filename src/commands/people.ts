import type { Command } from 'commander';
import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions, parseRange } from '../utils.js';

interface PeopleSearchOptions {
  query?: string;
  title?: string[];
  includeSimilarTitles?: boolean;
  city?: string[];
  seniority?: string[];
  department?: string[];
  emailStatus?: string[];
  technology?: string[];
  usingAllTechnology?: string[];
  notUsingTechnology?: string[];
  domain?: string[];
  industry?: string[];
  keywordTags?: string[];
  organizationIds?: string[];
  companyLocation?: string[];
  employees?: string;
  hiringFor?: string[];
  jobLocations?: string[];
  numJobs?: string;
  jobPosted?: string;
  revenue?: string;
  funding?: string;
  totalFunding?: string;
  page?: string;
  perPage?: string;
  format?: string;
}

interface PeopleEnrichOptions {
  email?: string;
  hashedEmail?: string;
  linkedin?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  domain?: string;
  revealPersonalEmails?: boolean;
  format?: string;
}

interface PeopleBulkEnrichOptions {
  emails?: string[];
  file?: string;
  revealPersonalEmails?: boolean;
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

// Maps people-search CLI options to the /mixed_people/api_search request body.
// Pure (no paging/IO) so it can be unit-tested directly.
export function buildPeopleSearchBody(opts: PeopleSearchOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (opts.query) body.q_keywords = opts.query;
  if (opts.title) body.person_titles = opts.title;
  if (opts.includeSimilarTitles) body.include_similar_titles = true;
  if (opts.city) body.person_locations = opts.city;
  if (opts.seniority) body.person_seniorities = opts.seniority;
  if (opts.department) body.person_departments = opts.department;
  if (opts.emailStatus) body.contact_email_status = opts.emailStatus;
  if (opts.technology) body.currently_using_any_of_technology_uids = opts.technology;
  if (opts.usingAllTechnology) body.currently_using_all_of_technology_uids = opts.usingAllTechnology;
  if (opts.notUsingTechnology) body.currently_not_using_any_of_technology_uids = opts.notUsingTechnology;
  if (opts.domain) body.q_organization_domains_list = opts.domain;
  if (opts.industry) body.organization_industry_tag_ids = opts.industry;
  if (opts.keywordTags) body.q_organization_keyword_tags = opts.keywordTags;
  if (opts.organizationIds) body.organization_ids = opts.organizationIds;
  if (opts.companyLocation) body.organization_locations = opts.companyLocation;
  if (opts.employees) body.organization_num_employees_ranges = [opts.employees];
  if (opts.hiringFor) body.q_organization_job_titles = opts.hiringFor;
  if (opts.jobLocations) body.organization_job_locations = opts.jobLocations;
  if (opts.numJobs) body.organization_num_jobs_range = parseRange(opts.numJobs);
  if (opts.jobPosted) body.organization_job_posted_at_range = parseRange(opts.jobPosted);
  if (opts.revenue) body.revenue_range = parseRange(opts.revenue);
  if (opts.funding) body.latest_funding_amount_range = parseRange(opts.funding);
  if (opts.totalFunding) body.total_funding_range = parseRange(opts.totalFunding);

  return body;
}

// Maps people-enrich CLI options to the /people/match request body.
export function buildPeopleEnrichBody(opts: PeopleEnrichOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (opts.email) body.email = opts.email;
  if (opts.hashedEmail) body.hashed_email = opts.hashedEmail;
  if (opts.linkedin) body.linkedin_url = opts.linkedin;
  if (opts.firstName) body.first_name = opts.firstName;
  if (opts.lastName) body.last_name = opts.lastName;
  if (opts.name) body.name = opts.name;
  if (opts.company) body.organization_name = opts.company;
  if (opts.domain) body.domain = opts.domain;
  if (opts.revealPersonalEmails) body.reveal_personal_emails = true;

  return body;
}

export function registerPeople(program: Command): void {
  const people = program.command('people').description('Search and enrich people');

  people
    .command('search')
    .description("Search for people in Apollo's database")
    .option('-q, --query <query>', 'Name or keyword query')
    .option('--title <titles...>', 'Job title(s) to filter by')
    .option('--include-similar-titles', 'Also match titles similar to --title (fuzzy instead of strict)')
    .option('--city <locations...>', "Filter by the person's location(s)")
    .option('--seniority <levels...>', 'Seniority level(s) (e.g. manager director vp c_suite)')
    .option('--department <depts...>', 'Department(s) to filter by (e.g. engineering sales)')
    .option('--email-status <statuses...>', 'Contact email status(es) (e.g. verified unverified)')
    .option('--technology <techs...>', "Technology UIDs the person's company uses (any of)")
    .option('--using-all-technology <techs...>', "Technology UIDs the person's company uses (all of)")
    .option('--not-using-technology <techs...>', "Technology UIDs the person's company does NOT use")
    .option('--domain <domains...>', 'Company domain(s) to filter by')
    .option('--industry <tagIds...>', 'Industry tag ID(s) (opaque IDs like 5567cd4773696439b10b0000, not free-text names)')
    .option('--keyword-tags <tags...>', "Free-text keyword tag(s) for the person's company")
    .option('--organization-ids <ids...>', 'Apollo organization ID(s) to restrict to')
    .option('--company-location <locations...>', "Filter by the person's company HQ location(s)")
    .option('--employees <range>', 'Company employee range (e.g. "11,50" or "51,200")')
    .option('--hiring-for <titles...>', 'Filter to people whose company is currently hiring for job title(s)')
    .option('--job-locations <locations...>', "Locations the person's company is hiring in")
    .option('--num-jobs <range>', 'Number of open jobs at the company as "min,max"')
    .option('--job-posted <range>', 'Job-posting date range as "min,max" (ISO dates)')
    .option('--revenue <range>', 'Company revenue range as "min,max" (e.g. "1000000,5000000")')
    .option('--funding <range>', 'Company latest funding amount as "min,max"')
    .option('--total-funding <range>', 'Company total funding raised as "min,max"')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: PeopleSearchOptions) => {
      const body = { ...parsePageOptions(opts), ...buildPeopleSearchBody(opts) };
      const data = await apolloRequest('/mixed_people/api_search', body);
      print(data, opts.format);
    });

  people
    .command('enrich')
    .description('Enrich a person profile')
    .option('--email <email>', 'Email address')
    .option('--hashed-email <hash>', 'MD5 or SHA-256 hashed email address')
    .option('--linkedin <url>', 'LinkedIn profile URL')
    .option('--first-name <name>', 'First name (use with --last-name and --company)')
    .option('--last-name <name>', 'Last name (use with --first-name and --company)')
    .option('--name <name>', 'Full name (use with --company)')
    .option('--company <domain>', 'Company name (use with --name or --first-name/--last-name)')
    .option('--domain <domain>', 'Company domain (e.g. acme.com)')
    .option('--reveal-personal-emails', 'Reveal personal emails (consumes credits)')
    .option(...FORMAT_OPTION)
    .action(async (opts: PeopleEnrichOptions) => {
      if (!opts.email && !opts.hashedEmail && !opts.linkedin && !opts.firstName && !opts.name) {
        console.error('Error: provide --email, --hashed-email, --linkedin, or --name/--first-name with --company');
        process.exit(1);
      }

      const data = await apolloRequest('/people/match', buildPeopleEnrichBody(opts));
      print(data, opts.format);
    });

  people
    .command('bulk-enrich')
    .description('Enrich multiple people by email or full identifier records')
    .option('--emails <emails...>', 'Email addresses to enrich')
    .option('--file <path>', 'Path to JSON file with an array of match records (or { "details": [...] })')
    .option('--reveal-personal-emails', 'Reveal personal emails (consumes credits)')
    .option(...FORMAT_OPTION)
    .action(async (opts: PeopleBulkEnrichOptions) => {
      let details: unknown[];
      if (opts.file) {
        const fs = await import('node:fs/promises');
        const text = await fs.readFile(opts.file, 'utf8');
        const parsed: unknown = JSON.parse(text);
        const arr = Array.isArray(parsed)
          ? parsed
          : (parsed as { details?: unknown }).details;
        if (!Array.isArray(arr)) {
          console.error('Error: file must contain a JSON array of match records (or { "details": [...] })');
          process.exit(1);
        }
        details = arr;
      } else if (opts.emails) {
        details = opts.emails.map(email => ({ email }));
      } else {
        console.error('Error: provide --emails or --file');
        process.exit(1);
      }

      const body: Record<string, unknown> = { details };
      if (opts.revealPersonalEmails) body.reveal_personal_emails = true;
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
    .command('get')
    .description('Get complete person info by Apollo person ID')
    .requiredOption('--id <id>', 'Apollo person ID')
    .option(...FORMAT_OPTION)
    .action(async (opts: PeopleEmailOptions) => {
      const data = await apolloGet(`/people/${opts.id}`);
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
