import {
  cssPropertyFor,
  cssValue,
  formatValue,
  propertyLabel,
  type Recommendation,
  type ValidationIssue,
} from '@design-validator/design-spec';

/**
 * Deterministic CSS suggestion derived from the measured required value. AI
 * recommendations (packages/ai) may add context but never replace measurements.
 */
export function deterministicRecommendation(
  issue: Omit<ValidationIssue, 'recommendation'>,
): Recommendation | undefined {
  const label = propertyLabel(issue.property);
  if (issue.property === 'structure.presence') {
    return {
      source: 'deterministic',
      text:
        issue.required.kind === 'none'
          ? 'Remove this element or add it to the design.'
          : 'Add this element to the implementation.',
    };
  }
  if (issue.property === 'structure.count' && issue.delta?.kind === 'count') {
    const n = Math.abs(issue.delta.value);
    return {
      source: 'deterministic',
      text: `${issue.delta.value < 0 ? 'Remove' : 'Add'} ${n} repeated item${n === 1 ? '' : 's'}.`,
    };
  }
  if (issue.property === 'visibility') {
    return {
      source: 'deterministic',
      text: `Make this element ${formatValue(issue.required)} at this viewport (check media queries).`,
    };
  }
  const css = cssPropertyFor(issue.property);
  const value = cssValue(issue.required);
  if (!css || value === undefined) {
    return {
      source: 'deterministic',
      text: `Change ${label.toLowerCase()} to ${formatValue(issue.required)}.`,
    };
  }
  const selector = issue.element.selector ?? '.element';
  const declaration = css === 'font-family' ? `${css}: "${value}"` : `${css}: ${value}`;
  return {
    source: 'deterministic',
    text: `Set ${label.toLowerCase()} to ${formatValue(issue.required)}.`,
    code: `${selector} {\n  ${declaration};\n}`,
  };
}
