import { fontFamiliesEqual } from '@design-validator/design-spec';

import {
  compareKeyword,
  compareLength,
  keyword,
  lengthSeverity,
  type Finding,
  type PairContext,
} from './context';

const TEXT_ALIGN: Record<string, string> = {
  start: 'left',
  end: 'right',
  '-webkit-left': 'left',
  '-webkit-center': 'center',
};

export function compareTypography(context: PairContext): Finding[] {
  const required = context.design.typography;
  const current = context.implementation.typography;
  if (!required || !current) return [];
  const tolerance = context.tolerances.typographyPx;
  const findings: (Finding | null)[] = [];

  if (
    required.fontFamily &&
    current.fontFamily &&
    !fontFamiliesEqual(current.fontFamily, required.fontFamily)
  ) {
    findings.push({
      category: 'typography',
      property: 'typography.fontFamily',
      current: keyword(current.fontFamily),
      required: keyword(required.fontFamily),
      tolerance: 0,
      severity: 'high',
    });
  }
  findings.push(
    compareLength(
      'typography',
      'typography.fontSize',
      current.fontSize,
      required.fontSize,
      tolerance,
      (d) => lengthSeverity(d, 4, 2),
    ),
  );

  if (
    required.fontWeight != null &&
    current.fontWeight != null &&
    required.fontWeight !== current.fontWeight
  ) {
    const delta = required.fontWeight - current.fontWeight;
    findings.push({
      category: 'typography',
      property: 'typography.fontWeight',
      current: { kind: 'number', value: current.fontWeight },
      required: { kind: 'number', value: required.fontWeight },
      delta: { kind: 'number', value: delta },
      tolerance: 0,
      severity: Math.abs(delta) >= 200 ? 'high' : 'medium',
    });
  }

  // `normal` is a font-dependent state, not a number: it is never compared numerically.
  if (typeof required.lineHeight === 'number' && typeof current.lineHeight === 'number') {
    findings.push(
      compareLength(
        'typography',
        'typography.lineHeight',
        current.lineHeight,
        required.lineHeight,
        tolerance,
        (d) => lengthSeverity(d, 6, 3),
      ),
    );
  }
  findings.push(
    compareLength(
      'typography',
      'typography.letterSpacing',
      current.letterSpacing,
      required.letterSpacing,
      Math.min(tolerance, 0.2),
      () => 'low',
    ),
  );
  findings.push(
    compareKeyword(
      'typography',
      'typography.textTransform',
      current.textTransform,
      required.textTransform,
      'medium',
    ),
  );
  // A label sharing its parent's element (button text) is aligned by the parent box.
  if (!context.sharesParentImplementation)
    findings.push(
      compareKeyword(
        'typography',
        'typography.textAlign',
        current.textAlign,
        required.textAlign,
        'low',
        (v) => TEXT_ALIGN[v] ?? v,
      ),
    );
  findings.push(
    compareKeyword(
      'typography',
      'typography.textDecoration',
      current.textDecoration,
      required.textDecoration,
      'medium',
    ),
  );
  findings.push(
    compareKeyword(
      'typography',
      'typography.fontStyle',
      current.fontStyle,
      required.fontStyle,
      'medium',
    ),
  );
  return findings.filter((finding): finding is Finding => finding !== null);
}
