import { describe, expect, it } from 'vitest';

import { parseBoxShadow } from '../src';

describe('parseBoxShadow', () => {
  it('parses computed shadows including inset and multiple layers', () => {
    expect(
      parseBoxShadow('rgba(0, 0, 0, 0.1) 0px 4px 12px 0px, rgb(255, 0, 0) 1px 2px 0px 0px inset'),
    ).toEqual([
      { x: 0, y: 4, blur: 12, spread: 0, inset: false, color: { hex: '#000000', alpha: 0.1 } },
      { x: 1, y: 2, blur: 0, spread: 0, inset: true, color: { hex: '#ff0000', alpha: 1 } },
    ]);
  });

  it('returns an empty list for none and null when unparseable', () => {
    expect(parseBoxShadow('none')).toEqual([]);
    expect(parseBoxShadow('rgb(0, 0, 0) calc(1px + 1px) 0px')).toBeNull();
  });
});
