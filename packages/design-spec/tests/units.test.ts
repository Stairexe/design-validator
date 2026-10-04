import { describe, expect, it } from 'vitest';

import { roundPx, toPx } from '../src';

describe('toPx', () => {
  it.each([
    ['24px', {}, 24],
    ['1.5rem', {}, 24],
    ['1.5rem', { rootFontSize: 10 }, 15],
    ['2em', { fontSize: 18 }, 36],
    ['50%', { percentBase: 300 }, 150],
    ['0', {}, 0],
    [' 19.999998px ', {}, 20],
    [12, {}, 12],
  ] as const)('%j with %j → %d', (input, context, expected) => {
    expect(toPx(input, context)).toBe(expected);
  });

  it.each(['auto', 'normal', '2em', '50%', '12', 'calc(1px + 2px)', ''])(
    'keeps %j unresolved without context',
    (input) => {
      expect(toPx(input)).toBeNull();
    },
  );

  it('treats null/undefined/non-finite as unresolved', () => {
    expect(toPx(null)).toBeNull();
    expect(toPx(undefined)).toBeNull();
    expect(toPx(Number.NaN)).toBeNull();
  });

  it('never returns negative zero', () => {
    expect(Object.is(roundPx(-0.001), 0)).toBe(true);
  });
});
