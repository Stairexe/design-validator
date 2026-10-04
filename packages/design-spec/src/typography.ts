import { roundPx, toPx } from './units';
import type { LineHeight } from './types';

const WEIGHT_NAMES: Readonly<Record<string, number>> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

/**
 * Normalizes CSS weights (`400`, `bold`) and design-tool style names
 * (`SemiBold`, `Bold Italic`, `ExtraLight`) to the numeric 100–900 scale.
 */
export function normalizeFontWeight(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) {
    return null;
  }
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null;
  }
  const trimmed = input.trim();
  const numeric = Number(trimmed);
  if (trimmed !== '' && Number.isFinite(numeric)) {
    return numeric;
  }
  const key = trimmed
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/italic|oblique/g, '');
  return WEIGHT_NAMES[key === '' ? 'regular' : key] ?? null;
}

/** First family from a CSS `font-family` list, quotes stripped. */
export function normalizeFontFamily(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }
  const first = input
    .split(',')[0]
    ?.trim()
    .replace(/^["']|["']$/g, '')
    .trim();
  return first ? first : null;
}

export function fontFamiliesEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return (
    (normalizeFontFamily(a) ?? '').toLowerCase() === (normalizeFontFamily(b) ?? '').toLowerCase()
  );
}

/**
 * Normalizes line height to px. `normal` is preserved as a special state
 * rather than fabricated into a number. Unitless multipliers and percentages
 * need the font size.
 */
export function normalizeLineHeight(
  input: string | number | null | undefined,
  fontSize?: number | null,
): LineHeight | null {
  if (input === null || input === undefined) {
    return null;
  }
  if (typeof input === 'number') {
    return Number.isFinite(input) ? roundPx(input) : null;
  }
  const trimmed = input.trim().toLowerCase();
  if (trimmed === 'normal') {
    return 'normal';
  }
  const multiplier = Number(trimmed);
  if (trimmed !== '' && Number.isFinite(multiplier)) {
    return fontSize == null ? null : roundPx(multiplier * fontSize);
  }
  return toPx(trimmed, fontSize == null ? {} : { fontSize, percentBase: fontSize });
}
