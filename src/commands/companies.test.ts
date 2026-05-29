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

  it('omits unset filters', () => {
    expect(buildCompaniesSearchBody({})).toEqual({});
  });
});
