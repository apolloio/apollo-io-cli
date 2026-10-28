import { describe, it, expect, vi } from 'vitest';
import { buildPeopleSearchBody, buildPeopleEnrichBody, buildRevealFlags } from './people.js';

describe('buildPeopleSearchBody', () => {
  it('maps --city to person_locations (person, not org)', () => {
    expect(buildPeopleSearchBody({ city: ['San Francisco'] })).toEqual({
      person_locations: ['San Francisco'],
    });
  });

  it('maps --company-location to organization_locations (org, not person)', () => {
    expect(buildPeopleSearchBody({ companyLocation: ['Austin'] })).toEqual({
      organization_locations: ['Austin'],
    });
  });

  it('maps the new MCP parity filters', () => {
    const body = buildPeopleSearchBody({
      includeSimilarTitles: true,
      emailStatus: ['verified'],
      keywordTags: ['fintech'],
      organizationIds: ['org_1', 'org_2'],
      usingAllTechnology: ['react', 'aws'],
      notUsingTechnology: ['php'],
      jobLocations: ['Remote'],
      numJobs: '1,10',
      jobPosted: '2024-01-01,2024-12-31',
    });
    expect(body).toEqual({
      include_similar_titles: true,
      contact_email_status: ['verified'],
      q_organization_keyword_tags: ['fintech'],
      organization_ids: ['org_1', 'org_2'],
      currently_using_all_of_technology_uids: ['react', 'aws'],
      currently_not_using_any_of_technology_uids: ['php'],
      organization_job_locations: ['Remote'],
      organization_num_jobs_range: { min: '1', max: '10' },
      organization_job_posted_at_range: { min: '2024-01-01', max: '2024-12-31' },
    });
  });

  it('wraps --employees in an array and parses ranges', () => {
    const body = buildPeopleSearchBody({ employees: '51,200', revenue: '1000000,5000000' });
    expect(body.organization_num_employees_ranges).toEqual(['51,200']);
    expect(body.revenue_range).toEqual({ min: '1000000', max: '5000000' });
  });

  it('keeps the any-of technology filter distinct from all-of', () => {
    const body = buildPeopleSearchBody({ technology: ['salesforce'] });
    expect(body.currently_using_any_of_technology_uids).toEqual(['salesforce']);
    expect(body.currently_using_all_of_technology_uids).toBeUndefined();
  });

  it('omits unset filters', () => {
    expect(buildPeopleSearchBody({})).toEqual({});
  });

  it('maps --department-headcount to organization_department_or_subdepartment_counts', () => {
    const body = buildPeopleSearchBody({
      departmentHeadcount: ['master_sales:0,2', 'master_engineering_technical:50,200'],
    });
    expect(body.organization_department_or_subdepartment_counts).toEqual({
      master_sales: { min: '0', max: '2' },
      master_engineering_technical: { min: '50', max: '200' },
    });
  });

  it('maps the name, exclusion, industry-code, and lookalike filters', () => {
    const body = buildPeopleSearchBody({
      name: 'Jon Snow',
      notTitle: ['intern'],
      notPastTitle: ['recruiter'],
      notCity: ['Texas'],
      notCompanyLocation: ['Germany'],
      notDomain: ['apollo.io'],
      notIndustry: ['5567cd4773696439b10b0000'],
      industryName: ['hospital & health care'],
      naics: ['5415'],
      notNaics: ['31-33'],
      sic: ['7372'],
      notSic: ['91'],
      lookalikeIds: ['5e66b6381e05b4008c8331b8'],
    });
    expect(body).toEqual({
      q_person_name: 'Jon Snow',
      person_not_titles: ['intern'],
      person_not_past_titles: ['recruiter'],
      person_not_locations: ['Texas'],
      organization_not_locations: ['Germany'],
      not_organization_websites_list: ['apollo.io'],
      organization_not_industry_tag_ids: ['5567cd4773696439b10b0000'],
      organization_industries: ['hospital & health care'],
      organization_naics_codes: ['5415'],
      not_organization_naics_codes: ['31-33'],
      organization_sic_codes: ['7372'],
      not_organization_sic_codes: ['91'],
      lookalike_organization_ids: ['5e66b6381e05b4008c8331b8'],
    });
  });

  it('maps --headcount-growth to a range and --headcount-growth-months to a number', () => {
    expect(buildPeopleSearchBody({ headcountGrowth: '-20,-1', headcountGrowthMonths: '12' })).toEqual({
      organization_headcount_growth_range: { min: '-20', max: '-1' },
      organization_headcount_growth_past_n_months: 12,
    });
  });

  it.each([
    [{ headcountGrowth: '10,100' }, 'must be used together'],
    [{ headcountGrowthMonths: '12' }, 'must be used together'],
    [{ headcountGrowth: '10,100', headcountGrowthMonths: '3' }, 'must be 6, 12, or 24'],
  ])('exits instead of sending a headcount-growth filter the API would skip: %o', (opts, message) => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => buildPeopleSearchBody(opts)).toThrow('process.exit');
      expect(exit).toHaveBeenCalledWith(1);
      expect(error).toHaveBeenCalledWith(expect.stringContaining(message));
    } finally {
      exit.mockRestore();
      error.mockRestore();
    }
  });
});

describe('buildPeopleEnrichBody', () => {
  it('maps --company to organization_name and --domain to domain (distinct)', () => {
    expect(buildPeopleEnrichBody({ company: 'Acme', domain: 'acme.com' })).toEqual({
      organization_name: 'Acme',
      domain: 'acme.com',
    });
  });

  it('maps the new reveal + hashed-email params', () => {
    expect(buildPeopleEnrichBody({ hashedEmail: 'abc123', revealPersonalEmails: true })).toEqual({
      hashed_email: 'abc123',
      reveal_personal_emails: true,
    });
  });

  it('maps the phone, waterfall, and poll-only flags', () => {
    const body = buildPeopleEnrichBody({
      email: 'jane@acme.com',
      revealPhoneNumber: true,
      runWaterfallEmail: true,
      runWaterfallPhone: true,
      pollOnly: true,
    });
    expect(body).toEqual({
      email: 'jane@acme.com',
      reveal_phone_number: true,
      run_waterfall_email: true,
      run_waterfall_phone: true,
      poll_only: true,
    });
  });
});

describe('buildRevealFlags', () => {
  it('passes --webhook-url through and omits unset flags', () => {
    expect(buildRevealFlags({ revealPhoneNumber: true, webhookUrl: 'https://example.com/hook' })).toEqual({
      reveal_phone_number: true,
      webhook_url: 'https://example.com/hook',
    });
    expect(buildRevealFlags({})).toEqual({});
  });

  it.each([
    [{ revealPhoneNumber: true }, 'need --webhook-url or --poll-only'],
    [{ runWaterfallEmail: true }, 'need --webhook-url or --poll-only'],
    [{ runWaterfallPhone: true }, 'need --webhook-url or --poll-only'],
    [{ pollOnly: true, webhookUrl: 'https://example.com/hook' }, 'not both'],
  ])('exits instead of sending async flags with no single delivery target: %o', (opts, message) => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => buildRevealFlags(opts)).toThrow('process.exit');
      expect(exit).toHaveBeenCalledWith(1);
      expect(error).toHaveBeenCalledWith(expect.stringContaining(message));
    } finally {
      exit.mockRestore();
      error.mockRestore();
    }
  });
});
