import { lengthSeverity, compareLength, type Finding, type PairContext } from './context';

const CORNERS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const;

/**
 * Corner radii, clamped to half the shorter side first: a 9999px pill and a
 * 24px radius on a 48px-tall button render identically.
 */
export function compareRadius(context: PairContext): Finding[] {
  const { design, implementation, tolerances, scale } = context;
  if (context.sharesParentImplementation || design.type === 'text') return [];
  const clamp = (value: number | null | undefined, width: number, height: number) =>
    value == null ? value : Math.min(value, Math.min(width, height) / 2);

  const findings = CORNERS.map((corner) =>
    compareLength(
      'radius',
      `radius.${corner}`,
      clamp(
        implementation.radius[corner],
        implementation.bounds.width,
        implementation.bounds.height,
      ),
      clamp(
        design.radius[corner] == null
          ? design.radius[corner]
          : (design.radius[corner] ?? 0) * scale,
        design.bounds.width * scale,
        design.bounds.height * scale,
      ),
      tolerances.radiusPx,
      (delta) => lengthSeverity(delta, 8, 3),
    ),
  );
  const [topLeft, ...rest] = findings;
  if (
    topLeft &&
    rest.every(
      (finding) =>
        finding &&
        JSON.stringify([finding.current, finding.required]) ===
          JSON.stringify([topLeft.current, topLeft.required]),
    )
  ) {
    return [{ ...topLeft, property: 'radius' }];
  }
  return findings.filter((finding): finding is Finding => finding !== null);
}
