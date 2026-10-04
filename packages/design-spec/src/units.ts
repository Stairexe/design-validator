import type { Length } from './types';

export interface LengthContext {
  /** Root font size in px for `rem` (browser default 16). */
  rootFontSize?: number;
  /** Element font size in px for `em`. */
  fontSize?: number;
  /** Containing size in px for percentages. */
  percentBase?: number;
}

const LENGTH_PATTERN = /^(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)\s*(px|rem|em|%)?$/i;

/**
 * Converts a CSS length (or a bare number already in px) to CSS pixels.
 *
 * Returns `null` when the value cannot be resolved without missing context
 * (e.g. `50%` with no known containing size, `em` with no font size) or is not
 * a length at all (`auto`, `normal`). Never guesses.
 */
export function toPx(
  input: string | number | null | undefined,
  context: LengthContext = {},
): Length {
  if (input === null || input === undefined) {
    return null;
  }
  if (typeof input === 'number') {
    return Number.isFinite(input) ? roundPx(input) : null;
  }

  const match = LENGTH_PATTERN.exec(input.trim());
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  const unit = (match[2] ?? '').toLowerCase();

  switch (unit) {
    case 'px':
      return roundPx(value);
    case '':
      // Unitless lengths are only valid for zero in CSS.
      return value === 0 ? 0 : null;
    case 'rem':
      return roundPx(value * (context.rootFontSize ?? 16));
    case 'em':
      return context.fontSize === undefined ? null : roundPx(value * context.fontSize);
    case '%':
      return context.percentBase === undefined
        ? null
        : roundPx((value / 100) * context.percentBase);
    default:
      return null;
  }
}

/**
 * Rounds to 1/100 px. Browsers report sub-pixel layout values (e.g.
 * 19.999998px); rounding keeps normalized output stable across runs while
 * preserving genuine fractional values.
 */
export function roundPx(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}
