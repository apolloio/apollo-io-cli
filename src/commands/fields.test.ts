import { describe, it, expect, vi } from 'vitest';
import { buildFieldsUpdateBody } from './fields.js';

describe('buildFieldsUpdateBody', () => {
  it('wraps the one field in a fields array and leaves unset settings out', () => {
    expect(buildFieldsUpdateBody({ id: 'contact.694095a80f1b6000110fc556', label: 'Renewal owner' })).toEqual({
      fields: [{ id: 'contact.694095a80f1b6000110fc556', label: 'Renewal owner' }],
    });
  });

  it('maps --field-group-id and --max-length', () => {
    expect(buildFieldsUpdateBody({ id: 'contact.1', fieldGroupId: 'group_1', maxLength: '240' })).toEqual({
      fields: [{ id: 'contact.1', field_group_id: 'group_1', meta: { max_length: 240 } }],
    });
  });

  it('sends the --meta-file object, with --max-length taking precedence over its max_length', () => {
    const picklist = [{ id: 'opt_1', name: 'Gold' }, { name: 'Platinum' }];
    const meta = { picklist_values: picklist, max_length: 100 };
    expect(buildFieldsUpdateBody({ id: 'account.1' }, meta).fields).toEqual([{ id: 'account.1', meta }]);
    expect(buildFieldsUpdateBody({ id: 'account.1', maxLength: '240' }, meta).fields).toEqual([
      { id: 'account.1', meta: { picklist_values: picklist, max_length: 240 } },
    ]);
  });

  it('exits instead of sending an update with only the id', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => buildFieldsUpdateBody({ id: 'contact.1' })).toThrow('process.exit');
      expect(exit).toHaveBeenCalledWith(1);
      expect(error).toHaveBeenCalledWith(expect.stringContaining('nothing to update'));
    } finally {
      exit.mockRestore();
      error.mockRestore();
    }
  });
});
