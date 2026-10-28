import { describe, it, expect } from 'vitest';
import { buildCompaniesSearchBody } from './companies.js';

describe('buildCompaniesSearchBody', () => {
  it('maps --industry to keyword tags, falling back to --query', () => {
    expect(buildCompaniesSearchBody({ industry: ['saas'] }).q_organization_keyword_tags).toEqual(['saas']);
    expect(buildCompaniesSearchBody({ query: 'devtools' }).q_organization_keyword_tags).toEqual(['devtools']);
  });

  it('prefers --industry over --query for keyword tags', () => {
    const body = buildCompaniesSearchBody({ industry: ['saas'], query: 'devtools' });
    expect(body.q_organization_keyword_tags).toEqual(['saas']);
  });

  it('maps the new MCP parity filters', () => {
    const body = buildCompaniesSearchBody({
      name: 'Acme',
      domains: ['acme.com', 'acme.io'],
      organizationIds: ['org_1'],
      fundingDate: '2023-01-01,2024-01-01',
      jobLocations: ['Berlin'],
      numJobs: '5,50',
      jobPosted: '2024-06-01,2024-12-31',
    });
    expect(body).toEqual({
      q_organization_name: 'Acme',
      q_organization_domains_list: ['acme.com', 'acme.io'],
      organization_ids: ['org_1'],
      latest_funding_date_range: { min: '2023-01-01', max: '2024-01-01' },
      organization_job_locations: ['Berlin'],
      organization_num_jobs_range: { min: '5', max: '50' },
      organization_job_posted_at_range: { min: '2024-06-01', max: '2024-12-31' },
    });
  });

  it('maps the exclusion, industry-code, lookalike, and headcount-growth filters', () => {
    const body = buildCompaniesSearchBody({
      notKeywordTags: ['staffing'],
      notIndustryIds: ['5567cd4e7369643b70010000'],
      industryName: ['information technology & services'],
      naics: ['5415'],
      notNaics: ['92'],
      sic: ['73'],
      notSic: ['91'],
      notDomains: ['apollo.io'],
      lookalikeIds: ['5e66b6381e05b4008c8331b8'],
      headcountGrowth: '10,100',
      headcountGrowthMonths: '6',
    });
    expect(body).toEqual({
      q_not_organization_keyword_tags: ['staffing'],
      organization_not_industry_tag_ids: ['5567cd4e7369643b70010000'],
      organization_industries: ['information technology & services'],
      organization_naics_codes: ['5415'],
      not_organization_naics_codes: ['92'],
      organization_sic_codes: ['73'],
      not_organization_sic_codes: ['91'],
      not_organization_websites_list: ['apollo.io'],
      lookalike_organization_ids: ['5e66b6381e05b4008c8331b8'],
      organization_headcount_growth_range: { min: '10', max: '100' },
      organization_headcount_growth_past_n_months: 6,
    });
  });

  it('keeps --industry-ids separate from the --industry keyword tags', () => {
    const body = buildCompaniesSearchBody({ industry: ['saas'], industryIds: ['5567cd4773696439b10b0000'] });
    expect(body.q_organization_keyword_tags).toEqual(['saas']);
    expect(body.organization_industry_tag_ids).toEqual(['5567cd4773696439b10b0000']);
  });

  it('omits unset filters', () => {
    expect(buildCompaniesSearchBody({})).toEqual({});
  });
});
