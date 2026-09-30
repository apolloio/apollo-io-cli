import { describe, it, expect } from 'vitest';
import { withBareCustomFieldIds } from './fields.js';

describe('withBareCustomFieldIds', () => {
  const id = '6a956237c2686000205c7635';

  it('strips the modality prefix from custom field ids in fields[] and field', () => {
    const out = withBareCustomFieldIds({
      fields: [{ id: `contact.${id}`, field_name: 'contact.Opener' }],
      field: { id: `contact.${id}` },
      typed_custom_fields: [{ id }],
    });
    expect(out).toEqual({
      fields: [{ id, field_name: 'contact.Opener' }],
      field: { id },
      typed_custom_fields: [{ id }],
    });
  });

  it('handles custom-object modalities', () => {
    const out = withBareCustomFieldIds({ fields: [{ id: `co_${id}.${id}` }] });
    expect(out).toEqual({ fields: [{ id }] });
  });

  it('leaves system field ids and non-object responses alone', () => {
    expect(withBareCustomFieldIds({ fields: [{ id: 'contact.first_name' }] })).toEqual({
      fields: [{ id: 'contact.first_name' }],
    });
    expect(withBareCustomFieldIds(null)).toBeNull();
  });
});
