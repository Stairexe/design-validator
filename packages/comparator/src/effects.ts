import { colorsEqual, type ShadowValue } from '@design-validator/design-spec';

import { round, type Finding, type PairContext } from './context';

function shadowsEqual(a: ShadowValue[], b: ShadowValue[], tolerance: number): boolean {
  if (a.length !== b.length) return false;
  return a.every((shadow, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      shadow.inset === other.inset &&
      Math.abs(shadow.x - other.x) <= tolerance &&
      Math.abs(shadow.y - other.y) <= tolerance &&
      Math.abs(shadow.blur - other.blur) <= tolerance &&
      Math.abs(shadow.spread - other.spread) <= tolerance &&
      colorsEqual(shadow.color, other.color)
    );
  });
}

export function compareEffects(context: PairContext): Finding[] {
  const { design, implementation, tolerances } = context;
  if (context.sharesParentImplementation) return [];
  const findings: Finding[] = [];

  const required = design.effects.opacity;
  const current = implementation.effects.opacity;
  if (required != null && current != null && Math.abs(required - current) > tolerances.opacity) {
    findings.push({
      category: 'effect',
      property: 'effects.opacity',
      current: { kind: 'number', value: current },
      required: { kind: 'number', value: required },
      delta: { kind: 'number', value: round(required - current) },
      tolerance: tolerances.opacity,
      severity: Math.abs(required - current) >= 0.2 ? 'high' : 'medium',
    });
  }

  // `null` means the source could not describe shadows; only compare known lists.
  const requiredShadows = design.effects.shadows;
  const currentShadows = implementation.effects.shadows;
  if (
    requiredShadows &&
    currentShadows &&
    !shadowsEqual(currentShadows, requiredShadows, tolerances.spacingPx)
  ) {
    findings.push({
      category: 'effect',
      property: 'effects.shadows',
      current: { kind: 'shadow', value: currentShadows },
      required: { kind: 'shadow', value: requiredShadows },
      tolerance: tolerances.spacingPx,
      severity: requiredShadows.length !== currentShadows.length ? 'medium' : 'low',
    });
  }
  return findings;
}
