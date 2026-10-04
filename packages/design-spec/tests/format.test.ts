import { describe, expect, it } from 'vitest';

import { cssPropertyFor, cssValue, formatDelta, formatValue, propertyLabel } from '../src';

describe('formatting', () => {
  it('formats current/required/change in the documented wording', () => {
    expect(formatValue({ kind: 'length', value: 20 })).toBe('20px');
    expect(formatValue({ kind: 'length', value: 24 })).toBe('24px');
    expect(formatDelta({ kind: 'length', value: 4 })).toBe('+4px');
    expect(formatDelta({ kind: 'length', value: -2.5 })).toBe('-2.5px');
    expect(formatDelta({ kind: 'number', value: 100 })).toBe('+100');
    expect(formatDelta({ kind: 'color-distance', value: 3.14159 })).toBe('ΔE 3.14');
  });

  it('formats colours, keywords and missing values', () => {
    expect(formatValue({ kind: 'color', value: { hex: '#111111', alpha: 1 } })).toBe('#111111');
    expect(formatValue({ kind: 'keyword', value: 'Inter' })).toBe('Inter');
    expect(formatValue({ kind: 'none' })).toBe('none');
  });

  it('maps properties to labels and CSS', () => {
    expect(propertyLabel('padding.inline')).toBe('Padding X');
    expect(cssPropertyFor('padding.inline')).toBe('padding-inline');
    expect(cssPropertyFor('bounds.x')).toBeUndefined();
    expect(propertyLabel('custom.thing')).toBe('custom.thing');
  });

  it('renders CSS values', () => {
    expect(cssValue({ kind: 'length', value: 24 })).toBe('24px');
    expect(cssValue({ kind: 'color', value: { hex: '#000000', alpha: 0.5 } })).toBe('rgba(0, 0, 0, 0.5)');
    expect(
      cssValue({ kind: 'shadow', value: [{ x: 0, y: 4, blur: 12, spread: 0, inset: false, color: { hex: '#000000', alpha: 0.1 } }] }),
    ).toBe('0px 4px 12px 0px rgba(0, 0, 0, 0.1)');
  });
});
