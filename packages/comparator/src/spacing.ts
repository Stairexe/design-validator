import type { BoxSpacing, DesignElement, NormalizedValue } from '@design-validator/design-spec';

import { compareLength, type Finding, type PairContext } from './context';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

const sameValue = (a: NormalizedValue, b: NormalizedValue) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Merges equal per-side findings: left+right → `.inline`, top+bottom →
 * `.block`, all four → the shorthand. Mirrors how developers write CSS.
 */
export function mergeSides(
  prefix: string,
  findings: Map<(typeof SIDES)[number], Finding>,
): Finding[] {
  const same = (a: Finding | undefined, b: Finding | undefined) =>
    a !== undefined &&
    b !== undefined &&
    sameValue(a.current, b.current) &&
    sameValue(a.required, b.required);
  const { top, right, bottom, left } = Object.fromEntries(findings) as Partial<
    Record<(typeof SIDES)[number], Finding>
  >;

  if (same(top, right) && same(top, bottom) && same(top, left) && top) {
    return [{ ...top, property: prefix }];
  }
  const result: Finding[] = [];
  if (same(left, right) && left) result.push({ ...left, property: `${prefix}.inline` });
  else for (const side of [left, right]) if (side) result.push(side);
  if (same(top, bottom) && top) result.push({ ...top, property: `${prefix}.block` });
  else for (const side of [top, bottom]) if (side) result.push(side);
  return result;
}

function compareBox(
  prefix: 'padding' | 'margin',
  current: BoxSpacing | undefined,
  required: BoxSpacing | undefined,
  tolerance: number,
): Finding[] {
  if (!current || !required) return [];
  const findings = new Map<(typeof SIDES)[number], Finding>();
  for (const side of SIDES) {
    const finding = compareLength(
      'spacing',
      `${prefix}.${side}`,
      current[side],
      required[side],
      tolerance,
    );
    if (finding) findings.set(side, finding);
  }
  return mergeSides(prefix, findings);
}

/**
 * Measured main-axis spacing between consecutive visible children. Used when
 * the implementation achieves spacing with margins instead of `gap`.
 */
export function measuredGap(
  element: DesignElement,
  byId: ReadonlyMap<string, DesignElement>,
  direction: 'row' | 'column',
): number | null {
  const children = element.childIds
    .map((id) => byId.get(id))
    .filter((child): child is DesignElement =>
      Boolean(child?.visibility.visible && child.bounds.width > 0 && child.bounds.height > 0),
    )
    .sort((a, b) => (direction === 'row' ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y));
  if (children.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < children.length; i++) {
    const previous = children[i - 1];
    const next = children[i];
    if (!previous || !next) continue;
    gaps.push(
      direction === 'row'
        ? next.bounds.x - (previous.bounds.x + previous.bounds.width)
        : next.bounds.y - (previous.bounds.y + previous.bounds.height),
    );
  }
  const first = gaps[0] ?? 0;
  // Only a consistent spacing is a "gap"; irregular layouts are left to position checks.
  return gaps.every((gap) => Math.abs(gap - first) <= 1) ? Math.round(first * 100) / 100 : null;
}

export function compareSpacing(context: PairContext): Finding[] {
  const { design, implementation, tolerances, scale } = context;
  if (context.sharesParentImplementation) return [];
  const findings = [
    ...compareBox(
      'padding',
      implementation.spacing.padding,
      scaleBox(design.spacing.padding, scale),
      tolerances.spacingPx,
    ),
    ...compareBox(
      'margin',
      implementation.spacing.margin,
      design.spacing.margin ? scaleBox(design.spacing.margin, scale) : undefined,
      tolerances.spacingPx,
    ),
  ];

  const requiredGap = design.spacing.gap;
  if (requiredGap != null) {
    const direction = design.layout.flexDirection === 'row' ? 'row' : 'column';
    const currentGap =
      implementation.spacing.gap ??
      measuredGap(implementation, context.implementationById, direction);
    const finding = compareLength(
      'spacing',
      'gap',
      currentGap,
      requiredGap * scale,
      tolerances.spacingPx,
    );
    if (finding) {
      if (implementation.spacing.gap == null)
        finding.notes = ['Implementation spacing measured between children (no CSS gap).'];
      findings.push(finding);
    }
  }
  return findings;
}

function scaleBox(box: BoxSpacing | undefined, scale: number): BoxSpacing | undefined {
  if (!box || scale === 1) return box;
  const s = (value: number | null) => (value === null ? null : value * scale);
  return { top: s(box.top), right: s(box.right), bottom: s(box.bottom), left: s(box.left) };
}
