import {
  cssPropertyFor,
  formatDelta,
  formatValue,
  type ValidationIssue,
} from '@design-validator/design-spec';

/**
 * Compact, structured input for one element's differences (runtime-ai.md):
 * never page HTML, never a design file. Values are copied from the
 * deterministic report and are authoritative.
 */
export interface IssueGroupPayload {
  element: { name: string; selector?: string; designLayer?: string };
  viewport: string;
  differences: {
    issueId: string;
    property: string;
    cssProperty?: string;
    current: string;
    required: string;
    change?: string;
    category: string;
  }[];
}

export function buildIssueGroupPayload(issues: readonly ValidationIssue[]): IssueGroupPayload {
  const first = issues[0];
  if (!first) throw new Error('An issue group needs at least one issue.');
  return {
    element: {
      name: first.element.name,
      ...(first.element.selector ? { selector: first.element.selector } : {}),
      ...(first.element.designPath ? { designLayer: first.element.designPath } : {}),
    },
    viewport: first.viewportId,
    differences: issues.map((issue) => {
      const css = cssPropertyFor(issue.property);
      return {
        issueId: issue.id,
        property: issue.property,
        ...(css ? { cssProperty: css } : {}),
        current: formatValue(issue.current),
        required: formatValue(issue.required),
        ...(issue.delta ? { change: formatDelta(issue.delta) } : {}),
        category: issue.category,
      };
    }),
  };
}

/** Issues belonging to the same element pair in the same viewport (one AI request per group). */
export function sameElementGroup(
  issues: readonly ValidationIssue[],
  anchor: ValidationIssue,
): ValidationIssue[] {
  return issues.filter(
    (issue) =>
      issue.viewportId === anchor.viewportId &&
      issue.element.designId === anchor.element.designId &&
      issue.element.implementationId === anchor.element.implementationId,
  );
}
