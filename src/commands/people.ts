import type { Command } from 'commander';
import { apolloGet, apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions, parseRange, parseDepartmentHeadcounts } from '../utils.js';

interface PeopleSearchOptions {
  query?: string;
  name?: string;
  title?: string[];
  notTitle?: string[];
  notPastTitle?: string[];
  includeSimilarTitles?: boolean;
  city?: string[];
  notCity?: string[];
  seniority?: string[];
  department?: string[];
  emailStatus?: string[];
  technology?: string[];
  usingAllTechnology?: string[];
  notUsingTechnology?: string[];
  domain?: string[];
  notDomain?: string[];
  industry?: string[];
  notIndustry?: string[];
  industryName?: string[];
  naics?: string[];
  notNaics?: string[];
  sic?: string[];
  notSic?: string[];
  keywordTags?: string[];
  organizationIds?: string[];
  lookalikeIds?: string[];
  companyLocation?: string[];
  notCompanyLocation?: string[];
  employees?: string;
  headcountGrowth?: string;
  headcountGrowthMonths?: string;
  hiringFor?: string[];
  jobLocations?: string[];
  numJobs?: string;
  jobPosted?: string;
  revenue?: string;
  funding?: string;
  totalFunding?: string;
  departmentHeadcount?: string[];
  page?: string;
  perPage?: string;
  format?: string;
}

interface RevealOptions {
  revealPersonalEmails?: boolean;
  revealPhoneNumber?: boolean;
  runWaterfallEmail?: boolean;
  runWaterfallPhone?: boolean;
  webhookUrl?: string;
  pollOnly?: boolean;
}

interface PeopleEnrichOptions extends RevealOptions {
  email?: string;
  hashedEmail?: string;
  linkedin?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  domain?: string;
  format?: string;
}

interface PeopleBulkEnrichOptions extends RevealOptions {
  emails?: string[];
  file?: string;
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
  if (opts.name) body.q_person_name = opts.name;
  if (opts.title) body.person_titles = opts.title;
  if (opts.notTitle) body.person_not_titles = opts.notTitle;
  if (opts.notPastTitle) body.person_not_past_titles = opts.notPastTitle;
  if (opts.includeSimilarTitles) body.include_similar_titles = true;
  if (opts.city) body.person_locations = opts.city;
  if (opts.notCity) body.person_not_locations = opts.notCity;
  if (opts.seniority) body.person_seniorities = opts.seniority;
  if (opts.department) body.person_departments = opts.department;
  if (opts.emailStatus) body.contact_email_status = opts.emailStatus;
  if (opts.technology) body.currently_using_any_of_technology_uids = opts.technology;
  if (opts.usingAllTechnology) body.currently_using_all_of_technology_uids = opts.usingAllTechnology;
  if (opts.notUsingTechnology) body.currently_not_using_any_of_technology_uids = opts.notUsingTechnology;
  if (opts.domain) body.q_organization_domains_list = opts.domain;
  if (opts.notDomain) body.not_organization_websites_list = opts.notDomain;
  if (opts.industry) body.organization_industry_tag_ids = opts.industry;
  if (opts.notIndustry) body.organization_not_industry_tag_ids = opts.notIndustry;
  if (opts.industryName) body.organization_industries = opts.industryName;
  if (opts.naics) body.organization_naics_codes = opts.naics;
  if (opts.notNaics) body.not_organization_naics_codes = opts.notNaics;
  if (opts.sic) body.organization_sic_codes = opts.sic;
  if (opts.notSic) body.not_organization_sic_codes = opts.notSic;
  if (opts.keywordTags) body.q_organization_keyword_tags = opts.keywordTags;
  if (opts.organizationIds) body.organization_ids = opts.organizationIds;
  if (opts.lookalikeIds) body.lookalike_organization_ids = opts.lookalikeIds;
  if (opts.companyLocation) body.organization_locations = opts.companyLocation;
  if (opts.notCompanyLocation) body.organization_not_locations = opts.notCompanyLocation;
  if (opts.employees) body.organization_num_employees_ranges = [opts.employees];
  if (opts.headcountGrowth) body.organization_headcount_growth_range = parseRange(opts.headcountGrowth);
  if (opts.headcountGrowthMonths) body.organization_headcount_growth_past_n_months = Number(opts.headcountGrowthMonths);
  if (opts.hiringFor) body.q_organization_job_titles = opts.hiringFor;
  if (opts.jobLocations) body.organization_job_locations = opts.jobLocations;
  if (opts.numJobs) body.organization_num_jobs_range = parseRange(opts.numJobs);
  if (opts.jobPosted) body.organization_job_posted_at_range = parseRange(opts.jobPosted);
  if (opts.revenue) body.revenue_range = parseRange(opts.revenue);
  if (opts.funding) body.latest_funding_amount_range = parseRange(opts.funding);
  if (opts.totalFunding) body.total_funding_range = parseRange(opts.totalFunding);
  if (opts.departmentHeadcount) {
    body.organization_department_or_subdepartment_counts = parseDepartmentHeadcounts(opts.departmentHeadcount);
  }

  return body;
}

// Maps the reveal, waterfall, and result-delivery flags shared by people enrich and bulk-enrich.
export function buildRevealFlags(opts: RevealOptions): Record<string, unknown> {
  const flags: Record<string, unknown> = {};
  if (opts.revealPersonalEmails) flags.reveal_personal_emails = true;
  if (opts.revealPhoneNumber) flags.reveal_phone_number = true;
  if (opts.runWaterfallEmail) flags.run_waterfall_email = true;
  if (opts.runWaterfallPhone) flags.run_waterfall_phone = true;
  if (opts.webhookUrl) flags.webhook_url = opts.webhookUrl;
  if (opts.pollOnly) flags.poll_only = true;
  return flags;
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

  return { ...body, ...buildRevealFlags(opts) };
}

export function registerPeople(program: Command): void {
  const people = program.command('people').description('Search and enrich people');

  people
    .command('search')
    .description("Search for people in Apollo's database")
    .option('-q, --query <query>', 'Name or keyword query')
    .option('--name <name>', "Person's name (matches people whose name contains all the words)")
    .option('--title <titles...>', 'Job title(s) to filter by')
    .option('--not-title <titles...>', 'Exclude people whose current job title matches any of these')
    .option('--not-past-title <titles...>', 'Exclude people who held any of these job titles in a previous role')
    .option('--include-similar-titles', 'Also match titles similar to --title (fuzzy instead of strict)')
    .option('--city <locations...>', "Filter by the person's location(s)")
    .option('--not-city <locations...>', "Exclude people by their location(s) (cities, states, countries, postal codes)")
    .option('--seniority <levels...>', 'Seniority level(s) (e.g. manager director vp c_suite)')
    .option('--department <depts...>', 'Department(s) to filter by (e.g. engineering sales)')
    .option('--email-status <statuses...>', 'Contact email status(es) (e.g. verified unverified)')
    .option('--technology <techs...>', "Technology UIDs the person's company uses (any of)")
    .option('--using-all-technology <techs...>', "Technology UIDs the person's company uses (all of)")
    .option('--not-using-technology <techs...>', "Technology UIDs the person's company does NOT use")
    .option('--domain <domains...>', 'Company domain(s) to filter by')
    .option('--not-domain <domains...>', 'Exclude people whose company matches any of these domain(s)')
    .option('--industry <tagIds...>', 'Industry tag ID(s) (opaque IDs like 5567cd4773696439b10b0000, not free-text names)')
    .option('--not-industry <tagIds...>', 'Exclude companies in these industry tag ID(s)')
    .option('--industry-name <names...>', 'Industry name(s), exact Apollo spelling (e.g. "information technology & services")')
    .option('--naics <codes...>', 'Company NAICS code(s), prefix or range match (e.g. 5415 or 31-33)')
    .option('--not-naics <codes...>', 'Exclude companies with these NAICS code(s)')
    .option('--sic <codes...>', 'Company SIC code(s), prefix match (e.g. 7372)')
    .option('--not-sic <codes...>', 'Exclude companies with these SIC code(s)')
    .option('--keyword-tags <tags...>', "Free-text keyword tag(s) for the person's company")
    .option('--organization-ids <ids...>', 'Apollo organization ID(s) to restrict to')
    .option('--lookalike-ids <ids...>', 'Apollo organization ID(s) to use as lookalike seeds (people at similar companies)')
    .option('--company-location <locations...>', "Filter by the person's company HQ location(s)")
    .option('--not-company-location <locations...>', "Exclude people by their company's HQ location(s)")
    .option('--employees <range>', 'Company employee range (e.g. "11,50" or "51,200")')
    .option('--headcount-growth <range>', 'Company headcount growth in percent as "min,max" (e.g. "10,100"; requires --headcount-growth-months)')
    .option('--headcount-growth-months <n>', 'Window for --headcount-growth: 6, 12, or 24 months')
    .option('--hiring-for <titles...>', 'Filter to people whose company is currently hiring for job title(s)')
    .option('--job-locations <locations...>', "Locations the person's company is hiring in")
    .option('--num-jobs <range>', 'Number of open jobs at the company as "min,max"')
    .option('--job-posted <range>', 'Job-posting date range as "min,max" (ISO dates)')
    .option('--revenue <range>', 'Company revenue range as "min,max" (e.g. "1000000,5000000")')
    .option('--funding <range>', 'Company latest funding amount as "min,max"')
    .option('--total-funding <range>', 'Company total funding raised as "min,max"')
    .option(
      '--department-headcount <entries...>',
      'Filter by employee count in a department at the company, as "department:min,max" (e.g. master_sales:0,2). ' +
        'Valid departments: c_suite, product_management, master_engineering_technical, design, education, ' +
        'master_finance, master_human_resources, master_information_technology, master_legal, master_marketing, ' +
        'medical_health, master_operations, master_sales, consulting',
    )
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
    .option('--reveal-phone-number', 'Reveal phone numbers, including mobile (consumes credits; delivered async, see --poll-only)')
    .option('--run-waterfall-email', 'Run email waterfall enrichment (consumes credits; delivered async, see --poll-only)')
    .option('--run-waterfall-phone', 'Run phone waterfall enrichment (consumes credits; delivered async, see --poll-only)')
    .option('--webhook-url <url>', 'Webhook URL that receives phone and waterfall results')
    .option('--poll-only', 'Get phone and waterfall results by polling instead of a webhook: pass the returned request_id to `webhooks result`')
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
    .option('--reveal-phone-number', 'Reveal phone numbers, including mobile (consumes credits; delivered async, see --poll-only)')
    .option('--run-waterfall-email', 'Run email waterfall enrichment (consumes credits; delivered async, see --poll-only)')
    .option('--run-waterfall-phone', 'Run phone waterfall enrichment (consumes credits; delivered async, see --poll-only)')
    .option('--webhook-url <url>', 'Webhook URL that receives phone and waterfall results')
    .option('--poll-only', 'Get phone and waterfall results by polling instead of a webhook: pass the returned request_id to `webhooks result`')
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

      const data = await apolloRequest('/people/bulk_match', { details, ...buildRevealFlags(opts) });
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
