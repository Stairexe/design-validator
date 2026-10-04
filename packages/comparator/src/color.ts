import {
  colorDistance,
  colorsEqual,
  flattenColor,
  type ColorValue,
  type DesignElement,
  type IssueSeverity,
} from '@design-validator/design-spec';

import type { Finding, PairContext } from './context';

const WHITE: ColorValue = { hex: '#ffffff', alpha: 1 };

function colorSeverity(distance: number): IssueSeverity {
  if (distance >= 10) return 'high';
  if (distance >= 3) return 'medium';
  return 'low';
}

export function compareColorValues(
  property: string,
  current: ColorValue | null | undefined,
  required: ColorValue | null | undefined,
  tolerance: number,
): Finding | null {
  if (!current || !required || colorsEqual(current, required)) return null;
  const distance = colorDistance(current, required);
  if (distance <= tolerance) return null;
  return {
    category: 'color',
    property,
    current: { kind: 'color', value: current },
    required: { kind: 'color', value: required },
    delta: { kind: 'color-distance', value: distance },
    tolerance,
    severity: colorSeverity(distance),
  };
}

/** The colour actually seen behind an element: its own fill composited over its ancestors'. */
export function effectiveBackground(
  element: DesignElement,
  byId: ReadonlyMap<string, DesignElement>,
): ColorValue {
  const chain: ColorValue[] = [];
  let node: DesignElement | undefined = element;
  while (node) {
    const background = node.colors.background ?? node.colors.fill;
    if (background) {
      chain.push(background);
      if (background.alpha >= 0.995) break;
    }
    node = node.parentId ? byId.get(node.parentId) : undefined;
  }
  return chain.reverse().reduce<ColorValue>((under, over) => flattenColor(over, under), WHITE);
}

export function compareColors(context: PairContext): Finding[] {
  const { design, implementation, tolerances } = context;
  const findings: (Finding | null)[] = [];
  const requiredText = design.typography?.color ?? design.colors.text;
  const currentText = implementation.typography?.color ?? implementation.colors.text;
  findings.push(compareColorValues('color.text', currentText, requiredText, tolerances.colorDelta));

  if (
    !context.sharesParentImplementation &&
    (design.colors.background || implementation.colors.background)
  ) {
    // Compare what the viewer sees; report own values so the fix is concrete.
    const seen = compareColorValues(
      'color.background',
      effectiveBackground(implementation, context.implementationById),
      effectiveBackground(design, context.designById),
      tolerances.colorDelta,
    );
    if (seen) {
      findings.push({
        ...seen,
        current: implementation.colors.background
          ? { kind: 'color', value: implementation.colors.background }
          : { kind: 'none' },
        required: design.colors.background
          ? { kind: 'color', value: design.colors.background }
          : { kind: 'none' },
      });
    }
  }
  if (design.type === 'icon' || design.type === 'shape') {
    findings.push(
      compareColorValues(
        'color.fill',
        implementation.colors.fill,
        design.colors.fill,
        tolerances.colorDelta,
      ),
    );
  }
  return findings.filter((finding): finding is Finding => finding !== null);
}
