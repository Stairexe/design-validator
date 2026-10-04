import { describe, expect, it } from 'vitest';

import {
  colorDistance,
  colorsEqual,
  flattenColor,
  formatColor,
  parseColor,
  unitRgbaToColor,
} from '../src';

describe('parseColor', () => {
  it('normalizes equivalent notations to one canonical value', () => {
    const forms = [
      '#fff',
      '#ffffff',
      '#FFFFFFFF',
      'rgb(255,255,255)',
      'rgba(255, 255, 255, 1)',
      'rgb(255 255 255 / 100%)',
      'hsl(0, 0%, 100%)',
      'white',
    ];
    for (const form of forms) {
      expect(parseColor(form)).toEqual({ hex: '#ffffff', alpha: 1 });
    }
  });

  it('parses alpha in every notation', () => {
    expect(parseColor('rgba(0, 0, 0, 0.5)')).toEqual({ hex: '#000000', alpha: 0.5 });
    expect(parseColor('#00000080')).toEqual({ hex: '#000000', alpha: 0.502 });
    expect(parseColor('transparent')).toEqual({ hex: '#000000', alpha: 0 });
  });

  it.each(['currentcolor', 'linear-gradient(red, blue)', '#12', 'rgb(1,2)', '', null])(
    'returns null for %j',
    (input) => {
      expect(parseColor(input)).toBeNull();
    },
  );

  it('converts design-tool unit channels', () => {
    expect(unitRgbaToColor(1, 0.5, 0, 1)).toEqual({ hex: '#ff8000', alpha: 1 });
  });
});

describe('colour comparison', () => {
  it('treats #fff and rgba(255,255,255,1) as equal', () => {
    expect(colorsEqual(parseColor('#fff'), parseColor('rgba(255,255,255,1)'))).toBe(true);
  });

  it('measures perceptual distance', () => {
    const black = { hex: '#000000', alpha: 1 };
    expect(colorDistance(black, black)).toBe(0);
    expect(colorDistance({ hex: '#111111', alpha: 1 }, black)).toBeGreaterThan(0);
    expect(colorDistance({ hex: '#ffffff', alpha: 1 }, black)).toBeCloseTo(100, 0);
  });

  it('flattens translucent colours over white', () => {
    expect(flattenColor({ hex: '#000000', alpha: 0.5 })).toEqual({ hex: '#808080', alpha: 1 });
  });

  it('formats opaque and translucent colours', () => {
    expect(formatColor({ hex: '#111111', alpha: 1 })).toBe('#111111');
    expect(formatColor({ hex: '#111111', alpha: 0.5 })).toBe('#111111 / 50%');
  });
});
