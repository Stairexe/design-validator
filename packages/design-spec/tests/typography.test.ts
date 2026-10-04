import { describe, expect, it } from 'vitest';

import {
  fontFamiliesEqual,
  normalizeFontFamily,
  normalizeFontWeight,
  normalizeLineHeight,
} from '../src';

describe('normalizeFontWeight', () => {
  it.each([
    [700, 700],
    ['600', 600],
    ['bold', 700],
    ['normal', 400],
    ['SemiBold', 600],
    ['Extra Bold', 800],
    ['Bold Italic', 700],
    ['Italic', 400],
    ['Regular', 400],
  ] as const)('%j → %d', (input, expected) => {
    expect(normalizeFontWeight(input)).toBe(expected);
  });

  it('returns null for unknown names', () => {
    expect(normalizeFontWeight('Wobbly')).toBeNull();
    expect(normalizeFontWeight(null)).toBeNull();
  });
});

describe('font family', () => {
  it('takes the first family without quotes', () => {
    expect(normalizeFontFamily('"Inter Var", Inter, sans-serif')).toBe('Inter Var');
  });

  it('compares case-insensitively', () => {
    expect(fontFamiliesEqual('inter, sans-serif', 'Inter')).toBe(true);
    expect(fontFamiliesEqual('Inter', 'Geist')).toBe(false);
  });
});

describe('normalizeLineHeight', () => {
  it('preserves normal instead of fabricating a number', () => {
    expect(normalizeLineHeight('normal', 16)).toBe('normal');
  });

  it.each([
    ['24px', 16, 24],
    ['1.5', 16, 24],
    ['150%', 16, 24],
    [56, null, 56],
  ] as const)('%j at %j → %d', (input, fontSize, expected) => {
    expect(normalizeLineHeight(input, fontSize)).toBe(expected);
  });

  it('cannot resolve multipliers without a font size', () => {
    expect(normalizeLineHeight('1.5')).toBeNull();
  });
});
