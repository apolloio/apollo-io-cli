import { describe, it, expect } from 'vitest';
import { buildPeopleSearchBody, buildPeopleEnrichBody } from './people.js';

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
});
