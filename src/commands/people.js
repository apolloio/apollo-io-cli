import { apolloGet, apolloRequest } from '../api.js';
import { print } from '../output.js';
import { parsePageOptions } from '../utils.js';

export function registerPeople(program) {
  const people = program.command('people').description('Search and enrich people');

  people
    .command('search')
    .description('Search for people in Apollo\'s database')
    .option('-q, --query <query>', 'Name or keyword query')
    .option('--title <titles...>', 'Job title(s) to filter by')
    .option('--city <locations...>', 'Location(s) to filter by')
    .option('--seniority <levels...>', 'Seniority level(s) (e.g. manager director vp c_suite)')
    .option('--department <depts...>', 'Department(s) to filter by (e.g. engineering sales)')
    .option('--technology <techs...>', 'Technology UIDs the person\'s company uses')
    .option('--domain <domains...>', 'Company domain(s) to filter by')
    .option('--industry <industries...>', 'Industry(s) to filter by')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .action(async (opts) => {
      const body = parsePageOptions(opts);

      if (opts.query) body.q_keywords = opts.query;
      if (opts.title) body.person_titles = opts.title;
      if (opts.city) body.person_locations = opts.city;
      if (opts.seniority) body.person_seniorities = opts.seniority;
      if (opts.department) body.person_departments = opts.department;
      if (opts.technology) body.currently_using_any_of_technology_uids = opts.technology;
      if (opts.domain) body.q_organization_domains_list = opts.domain;
      if (opts.industry) body.organization_industry_tag_ids = opts.industry;

      const data = await apolloRequest('/mixed_people/api_search', body);
      print(data);
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
    .action(async (opts) => {
      if (!opts.email && !opts.linkedin && !opts.firstName && !opts.name) {
        console.error('Error: provide --email, --linkedin, or --name/--first-name with --company');
        process.exit(1);
      }

      const body = {};
      if (opts.email) body.email = opts.email;
      if (opts.linkedin) body.linkedin_url = opts.linkedin;
      if (opts.firstName) body.first_name = opts.firstName;
      if (opts.lastName) body.last_name = opts.lastName;
      if (opts.name) body.name = opts.name;
      if (opts.company) body.organization_name = opts.company;

      const data = await apolloRequest('/people/match', body);
      print(data);
    });

  people
    .command('bulk-enrich')
    .description('Enrich multiple people by email')
    .requiredOption('--emails <emails...>', 'Email addresses to enrich')
    .action(async (opts) => {
      const body = { details: opts.emails.map(email => ({ email })) };
      const data = await apolloRequest('/people/bulk_match', body);
      print(data);
    });

  people
    .command('email')
    .description('Get the email address for a person by Apollo person ID')
    .requiredOption('--id <id>', 'Apollo person ID')
    .action(async (opts) => {
      const data = await apolloGet('/people/match', { id: opts.id });
      print(data);
    });

  people
    .command('employees')
    .description('Find employees at a company')
    .option('--name <name>', 'Company name')
    .option('--domain <domain>', 'Company domain (e.g. acme.com)')
    .option('--linkedin <url>', 'Company LinkedIn URL')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .action(async (opts) => {
      const body = parsePageOptions(opts);

      if (opts.name) body.q_organization_name = opts.name;
      if (opts.domain) body.q_organization_domains_list = [opts.domain];
      if (opts.linkedin) body.organization_linkedin_url = opts.linkedin;

      const data = await apolloRequest('/mixed_people/api_search', body);
      print(data);
    });
}
