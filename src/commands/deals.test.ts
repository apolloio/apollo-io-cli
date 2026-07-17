import { describe, it, expect } from 'vitest';
import { buildDealsUpdateBody } from './deals.js';

describe('buildDealsUpdateBody', () => {
  it('returns an empty body when no fields are set', () => {
    expect(buildDealsUpdateBody({ id: 'opp_1' })).toEqual({});
  });

  it('maps all optional fields to API keys', () => {
    expect(
      buildDealsUpdateBody({
        id: 'opp_1',
        name: 'Massive Q3 Deal',
        ownerId: 'user_1',
        amount: '55123478',
        stageId: 'stage_1',
        closeDate: '2026-10-30',
      }),
    ).toEqual({
      name: 'Massive Q3 Deal',
      owner_id: 'user_1',
      amount: '55123478',
      opportunity_stage_id: 'stage_1',
      closed_date: '2026-10-30',
    });
  });
});
