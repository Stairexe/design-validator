import { colorDistance, type ColorValue, type DesignElement } from '@design-validator/design-spec';

const near = (
  a: number | null | undefined,
  b: number | null | undefined,
  range: number,
): number | null => (a == null || b == null ? null : 1 - Math.min(1, Math.abs(a - b) / range));

const colorNear = (
  a: ColorValue | null | undefined,
  b: ColorValue | null | undefined,
): number | null => (a && b ? 1 - Math.min(1, colorDistance(a, b) / 50) : null);

/** Secondary evidence from typography, colour and shape, in [0, 1] (null when nothing comparable). */
export function visualScore(design: DesignElement, implementation: DesignElement): number | null {
  const signals = [
    near(design.typography?.fontSize, implementation.typography?.fontSize, 16),
    near(design.typography?.fontWeight, implementation.typography?.fontWeight, 400),
    colorNear(
      design.colors.text ?? design.typography?.color,
      implementation.colors.text ?? implementation.typography?.color,
    ),
    colorNear(design.colors.background, implementation.colors.background),
    near(design.radius.topLeft, implementation.radius.topLeft, 16),
  ].filter((value): value is number => value !== null);
  return signals.length === 0
    ? null
    : signals.reduce((sum, value) => sum + value, 0) / signals.length;
}
