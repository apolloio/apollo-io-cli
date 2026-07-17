import { describe, it, expect } from 'vitest';
import { buildConversationsSearchBody } from './conversations.js';

describe('buildConversationsSearchBody', () => {
  it('returns an empty body when no filters are set', () => {
    expect(buildConversationsSearchBody({})).toEqual({});
  });

  it('maps filters to API keys and coerces numbers', () => {
    expect(
      buildConversationsSearchBody({
        page: '2',
        limit: '25',
        type: 'phone_call',
        accountId: 'acc_1',
        contactIds: ['c1', 'c2'],
        sortBy: 'started_at',
      }),
    ).toEqual({
      page: 2,
      num_fetch_result: 25,
      conversation_type: 'phone_call',
      account_id: 'acc_1',
      contact_ids: ['c1', 'c2'],
      sort_by_field: 'started_at',
    });
  });

  it('builds date_range from --date-from/--date-to', () => {
    expect(buildConversationsSearchBody({ dateFrom: '2026-01-01T00:00:00Z' })).toEqual({
      date_range: { start: '2026-01-01T00:00:00Z' },
    });
    expect(
      buildConversationsSearchBody({ dateFrom: '2026-01-01T00:00:00Z', dateTo: '2026-03-31T23:59:59Z' }),
    ).toEqual({
      date_range: { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z' },
    });
  });
});
