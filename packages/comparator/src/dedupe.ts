import {
  formatValue,
  propertyLabel,
  type IssueGroup,
  type ValidationIssue,
} from '@design-validator/design-spec';

import { stableId } from './ids';

/** Read access to the design hierarchy the grouping rules need. */
export interface DesignTree {
  parentOf(designId: string): string | undefined;
  /** Visible children in document order. */
  childrenOf(designId: string): string[];
  /** Auto-layout direction of the element, if any. */
  direction(designId: string): 'row' | 'column' | undefined;
}

const lengthDelta = (issue: ValidationIssue) =>
  issue.delta?.kind === 'length' ? issue.delta.value : null;
const near = (a: number, b: number, tolerance: number) =>
  Math.abs(a - b) <= Math.max(tolerance, 0.5);

const PADDING_FOR_AXIS: Record<string, readonly string[]> = {
  'bounds.x': ['padding.left', 'padding.inline', 'padding'],
  'bounds.y': ['padding.top', 'padding.block', 'padding'],
};

/** Issues that make an element longer along an axis (a text line's height is its line height). */
function growthProperties(axis: 'row' | 'column'): readonly string[] {
  return axis === 'column' ? ['bounds.height', 'typography.lineHeight'] : ['bounds.width'];
}

/**
 * Deterministic grouping (comparison-engine.md §11). Measured deltas are all
 * kept as evidence; groups only point at the likely root change.
 *
 * Rules, each requiring the measured deltas to add up:
 * 1. padding change → children shifted on that axis, and the element's own size
 * 2. gap change → children's main-axis position/size
 * 3. a sibling grew → following siblings shifted along the flow
 * 4. children grew → their container grew
 * Chains collapse to the ultimate root (line height → container height → next section shift).
 */
export function groupIssues(issues: ValidationIssue[], tree: DesignTree): IssueGroup[] {
  const groups: IssueGroup[] = [];

  const byElement = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    const key = `${issue.viewportId}|${issue.element.designId ?? ''}|${issue.element.implementationId ?? ''}`;
    byElement.set(key, [...(byElement.get(key) ?? []), issue]);
  }
  for (const [key, members] of byElement) {
    const first = members[0];
    if (!first || members.length < 2) continue;
    groups.push({
      id: stableId('grp', key),
      viewportId: first.viewportId,
      kind: 'element',
      label: first.element.name,
      issueIds: members.map((m) => m.id),
    });
  }

  const issuesOf = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    const id = issue.element.designId;
    if (id)
      issuesOf.set(`${issue.viewportId}|${id}`, [
        ...(issuesOf.get(`${issue.viewportId}|${id}`) ?? []),
        issue,
      ]);
  }
  const find = (viewportId: string, designId: string, properties: readonly string[]) =>
    (issuesOf.get(`${viewportId}|${designId}`) ?? []).filter((issue) =>
      properties.includes(issue.property),
    );

  const explainedBy = new Map<string, string>();
  const explain = (root: ValidationIssue, child: ValidationIssue) => {
    if (root.id !== child.id && !explainedBy.has(child.id)) explainedBy.set(child.id, root.id);
  };

  for (const issue of issues) {
    const designId = issue.element.designId;
    const delta = lengthDelta(issue);
    if (!designId || delta === null) continue;
    const parent = tree.parentOf(designId);

    // Rule 1: own padding explains own size.
    for (const padding of find(issue.viewportId, designId, [
      'padding',
      'padding.inline',
      'padding.block',
      'padding.left',
      'padding.right',
      'padding.top',
      'padding.bottom',
    ])) {
      const paddingDelta = lengthDelta(padding);
      if (paddingDelta === null || issue.category !== 'size') continue;
      const both =
        padding.property === 'padding' ||
        padding.property.endsWith('.inline') ||
        padding.property.endsWith('.block');
      const vertical = /top|bottom|block/.test(padding.property);
      const axisMatches =
        padding.property === 'padding' || (issue.property === 'bounds.height') === vertical;
      if (axisMatches && near(delta, paddingDelta * (both ? 2 : 1), issue.tolerance))
        explain(padding, issue);
    }
    // Rule 2: own gap explains own main-axis size: gap × (children − 1).
    const ownDirection = tree.direction(designId);
    if (
      ownDirection &&
      issue.property === (ownDirection === 'row' ? 'bounds.width' : 'bounds.height')
    ) {
      const gaps = Math.max(0, tree.childrenOf(designId).length - 1);
      for (const gap of find(issue.viewportId, designId, ['gap'])) {
        const gapDelta = lengthDelta(gap);
        if (gapDelta !== null && near(delta, gapDelta * gaps, issue.tolerance)) explain(gap, issue);
      }
    }
    if (!parent) continue;

    // Rule 1: parent padding shifts this child.
    for (const padding of find(issue.viewportId, parent, PADDING_FOR_AXIS[issue.property] ?? [])) {
      const paddingDelta = lengthDelta(padding);
      if (paddingDelta !== null && near(delta, paddingDelta, issue.tolerance))
        explain(padding, issue);
    }

    const direction = tree.direction(parent);
    // Rule 2: parent gap affects children along the main axis.
    const mainAxis =
      direction === 'row' ? ['bounds.x', 'bounds.width'] : ['bounds.y', 'bounds.height'];
    if (direction && mainAxis.includes(issue.property)) {
      for (const gap of find(issue.viewportId, parent, ['gap'])) explain(gap, issue);
    }

    // Rule 3: preceding siblings grew along the flow.
    const flowAxis = direction ?? 'column';
    if (issue.property === (flowAxis === 'row' ? 'bounds.x' : 'bounds.y')) {
      const siblings = tree.childrenOf(parent);
      const before = siblings.slice(0, Math.max(0, siblings.indexOf(designId)));
      const growth = before.flatMap((sibling) =>
        find(issue.viewportId, sibling, growthProperties(flowAxis)).filter(
          (g) =>
            g.property !== 'bounds.height' ||
            !find(issue.viewportId, sibling, ['typography.lineHeight']).length,
        ),
      );
      const total = growth.reduce((sum, g) => sum + (lengthDelta(g) ?? 0), 0);
      const first = growth[0];
      if (first && near(delta, total, issue.tolerance)) explain(first, issue);
    }
  }

  // Rule 4: children grew → container grew.
  for (const issue of issues) {
    const designId = issue.element.designId;
    const delta = lengthDelta(issue);
    if (
      !designId ||
      delta === null ||
      (issue.property !== 'bounds.height' && issue.property !== 'bounds.width')
    )
      continue;
    const flowAxis = tree.direction(designId) ?? 'column';
    if ((issue.property === 'bounds.height') !== (flowAxis === 'column')) continue;
    const growth = tree
      .childrenOf(designId)
      .flatMap((child) => find(issue.viewportId, child, growthProperties(flowAxis)).slice(0, 1));
    const total = growth.reduce((sum, g) => sum + (lengthDelta(g) ?? 0), 0);
    const first = growth[0];
    if (first && near(delta, total, issue.tolerance)) explain(first, issue);
  }

  // Collapse chains so each issue points at its ultimate root.
  const rootOf = (id: string): string => {
    const seen = new Set<string>();
    let current = id;
    while (explainedBy.has(current) && !seen.has(current)) {
      seen.add(current);
      current = explainedBy.get(current) ?? current;
    }
    return current;
  };
  const members = new Map<string, string[]>();
  for (const id of explainedBy.keys()) {
    const root = rootOf(id);
    if (root !== id) members.set(root, [...(members.get(root) ?? []), id]);
  }
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  for (const [rootId, explained] of members) {
    const root = byId.get(rootId);
    if (!root) continue;
    groups.push({
      id: stableId('grp', `root|${rootId}`),
      viewportId: root.viewportId,
      kind: 'likely-root-cause',
      label: `Likely root change: ${root.element.name} ${propertyLabel(root.property).toLowerCase()} ${formatValue(root.current)} → ${formatValue(root.required)}`,
      issueIds: [rootId, ...explained.sort()],
      rootIssueId: rootId,
    });
  }
  return groups;
}
