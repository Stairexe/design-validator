import { compareColorValues } from './color';
import { compareKeyword, compareLength, type Finding, type PairContext } from './context';
import { mergeSides } from './spacing';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

export function compareBorder(context: PairContext): Finding[] {
  const { design, implementation, tolerances } = context;
  if (context.sharesParentImplementation) return [];
  const widths = new Map<(typeof SIDES)[number], Finding>();
  for (const side of SIDES) {
    const finding = compareLength(
      'border',
      `border.width.${side}`,
      implementation.border.width[side],
      design.border.width[side],
      tolerances.borderPx,
      () => 'medium',
    );
    if (finding) widths.set(side, finding);
  }
  const findings: (Finding | null)[] = mergeSides('border.width', widths);

  const hasBorder = (width: typeof design.border.width) =>
    SIDES.some((side) => (width[side] ?? 0) > 0);
  if (hasBorder(design.border.width) && hasBorder(implementation.border.width)) {
    findings.push(
      compareKeyword(
        'border',
        'border.style',
        implementation.border.style,
        design.border.style,
        'medium',
      ),
    );
    const color = compareColorValues(
      'border.color',
      implementation.border.color,
      design.border.color,
      tolerances.colorDelta,
    );
    findings.push(color ? { ...color, category: 'border' } : null);
  }
  return findings.filter((finding): finding is Finding => finding !== null);
}
