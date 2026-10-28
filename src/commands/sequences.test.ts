import { describe, it, expect } from 'vitest';
import { buildSequenceCreateBody, buildSequenceUpdateBody } from './sequences.js';

const STEPS = [{ position: 1, type: 'auto_email' }];

describe('buildSequenceCreateBody', () => {
  it('always includes name and emailer_steps', () => {
    expect(buildSequenceCreateBody({ name: 'Q2 Outbound', stepsFile: 'x.json' }, STEPS)).toEqual({
      name: 'Q2 Outbound',
      emailer_steps: STEPS,
    });
  });

  it('maps optional fields', () => {
    const body = buildSequenceCreateBody(
      {
        name: 'Q2',
        stepsFile: 'x.json',
        scheduleId: 'sched_1',
        permissions: 'team_can_use',
        exactDaytime: true,
        active: true,
        label: ['outbound'],
      },
      STEPS,
    );
    expect(body).toEqual({
      name: 'Q2',
      emailer_steps: STEPS,
      emailer_schedule_id: 'sched_1',
      permissions: 'team_can_use',
      sequence_by_exact_daytime: true,
      active: true,
      label_names: ['outbound'],
    });
  });

  it('omits active when not set', () => {
    expect(buildSequenceCreateBody({ name: 'Q2', stepsFile: 'x.json' }, STEPS).active).toBeUndefined();
  });
});

describe('buildSequenceUpdateBody', () => {
  it('always sends emailer_steps and leaves unset fields out', () => {
    expect(buildSequenceUpdateBody({ id: 'seq_1', stepsFile: 'x.json' }, STEPS)).toEqual({
      emailer_steps: STEPS,
    });
  });

  it('--active sets active true; --inactive sets active false', () => {
    expect(buildSequenceUpdateBody({ id: 's', stepsFile: 'x', active: true }, STEPS).active).toBe(true);
    expect(buildSequenceUpdateBody({ id: 's', stepsFile: 'x', inactive: true }, STEPS).active).toBe(false);
  });

  it('maps --visibility and --access-type into sharing_permission and --owner-id to user_id', () => {
    const body = buildSequenceUpdateBody(
      { id: 's', stepsFile: 'x', visibility: 'everyone', accessType: 'can_edit', ownerId: 'user_1' },
      STEPS,
    );
    expect(body).toEqual({
      emailer_steps: STEPS,
      sharing_permission: { visibility: 'everyone', access_type: 'can_edit' },
      user_id: 'user_1',
    });
  });

  it('sends only the sharing keys that were set', () => {
    const body = buildSequenceUpdateBody({ id: 's', stepsFile: 'x', visibility: 'restricted' }, STEPS);
    expect(body.sharing_permission).toEqual({ visibility: 'restricted' });
  });
});
