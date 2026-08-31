import { describe, it, expect } from 'vitest';
import { normalizeIds } from './utils.js';

describe('normalizeIds', () => {
  it('leaves properly variadic ids untouched', () => {
    expect(normalizeIds(['6a9570afd7400f001011956b', '6a9570b3087bc9001871f233'])).toEqual([
      '6a9570afd7400f001011956b',
      '6a9570b3087bc9001871f233',
    ]);
  });

  it('splits ids packed into a single argument', () => {
    expect(normalizeIds(['6a9570afd7400f001011956b 6a9570b3087bc9001871f233'])).toEqual([
      '6a9570afd7400f001011956b',
      '6a9570b3087bc9001871f233',
    ]);
  });

  it('splits on commas too', () => {
    expect(normalizeIds(['a,b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('drops empty fragments from stray separators', () => {
    expect(normalizeIds(['  a  ,, b ', ''])).toEqual(['a', 'b']);
  });
});
