import {
  DEFAULT_TOLERANCES,
  ISSUE_CATEGORIES,
  MATCH_CONFIDENCE,
  type ComparisonTolerances,
  type DesignPage,
  type DesignViewport,
  type IssueCategory,
  type IssueGroup,
  type MatchResult,
  type UnresolvedComparison,
  type ValidationIssue,
  type ValidationReport,
  type ViewportReport,
} from '@design-validator/design-spec';

import { compareBorder } from './border';
import { compareColors } from './color';
import type { IssueDraft, PairContext, PropertyComparator } from './context';
import { groupIssues } from './dedupe';
import { compareEffects } from './effects';
import { stableId } from './ids';
import { compareLayout } from './layout';
import { comparePosition } from './position';
import { compareRadius } from './radius';
import { deterministicRecommendation } from './recommend';
import { compareSize } from './size';
import { compareSpacing } from './spacing';
import { compareStructure } from './structure';
import { compareTypography } from './typography';

export { deterministicRecommendation } from './recommend';
export { stableId } from './ids';

const COMPARATORS: readonly PropertyComparator[] = [
  comparePosition,
  compareSize,
  compareSpacing,
  compareTypography,
  compareColors,
  compareBorder,
  compareRadius,
  compareEffects,
  compareLayout,
];

export interface CompareViewportInput {
  viewport: DesignViewport;
  design: DesignPage;
  implementation: DesignPage;
  matches: MatchResult;
  tolerances?: Partial<ComparisonTolerances>;
}

export interface ViewportComparison {
  viewport: ViewportReport;
  issues: ValidationIssue[];
  unresolved: UnresolvedComparison[];
  groups: IssueGroup[];
}

const CATEGORY_ORDER = new Map(ISSUE_CATEGORIES.map((category, index) => [category, index]));
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;

/**
 * Deterministically compares one viewport's matched elements and returns
 * exact differences. No scoring: the output is the list of changes to make.
 */
export function compareViewport({
  viewport,
  design,
  implementation,
  matches,
  tolerances,
}: CompareViewportInput): ViewportComparison {
  const resolvedTolerances: ComparisonTolerances = { ...DEFAULT_TOLERANCES, ...tolerances };
  const designById = new Map(design.elements.map((element) => [element.id, element]));
  const implementationById = new Map(
    implementation.elements.map((element) => [element.id, element]),
  );
  const designRoot = design.elements.find((element) => !element.parentId);
  const scale = viewport.width / (designRoot?.bounds.width || design.width || viewport.width);
  const usable = matches.matches.filter(
    (match) => !match.ambiguous && match.confidence >= MATCH_CONFIDENCE.ambiguous,
  );
  const matchByDesign = new Map(usable.map((match) => [match.designId, match.implementationId]));

  const drafts: IssueDraft[] = [];
  for (const match of usable) {
    const design = designById.get(match.designId);
    const implementation = implementationById.get(match.implementationId);
    if (!design || !implementation) continue;
    const context: PairContext = {
      viewportId: viewport.id,
      design,
      implementation,
      match,
      scale,
      tolerances: resolvedTolerances,
      designById,
      implementationById,
      matchByDesign,
      sharesParentImplementation: Boolean(
        design.parentId && matchByDesign.get(design.parentId) === implementation.id,
      ),
    };
    for (const comparator of COMPARATORS) {
      for (const finding of comparator(context)) {
        drafts.push({
          viewportId: viewport.id,
          category: finding.category,
          severity: finding.severity,
          element: {
            designId: design.id,
            implementationId: implementation.id,
            name: design.name ?? implementation.name ?? design.id,
            ...(implementation.source.selector ? { selector: implementation.source.selector } : {}),
            ...(design.source.sourcePath ? { designPath: design.source.sourcePath } : {}),
            designBounds: design.bounds,
            implementationBounds: implementation.bounds,
          },
          property: finding.property,
          current: finding.current,
          required: finding.required,
          ...(finding.delta ? { delta: finding.delta } : {}),
          tolerance: finding.tolerance,
          status: 'difference',
          evidence: {
            matchConfidence: match.confidence,
            matchMethods: match.methods,
            ...(finding.notes ? { notes: finding.notes } : {}),
          },
        });
      }
    }
  }
  drafts.push(...compareStructure(viewport.id, design, implementation, matches));

  const issues: ValidationIssue[] = drafts.map((draft) => {
    const id = stableId(
      'iss',
      `${draft.viewportId}|${draft.element.designId ?? ''}|${draft.element.implementationId ?? ''}|${draft.property}`,
    );
    const recommendation = deterministicRecommendation({ ...draft, id });
    return { ...draft, id, ...(recommendation ? { recommendation } : {}) };
  });
  issues.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      (CATEGORY_ORDER.get(a.category) ?? 0) - (CATEGORY_ORDER.get(b.category) ?? 0) ||
      a.id.localeCompare(b.id),
  );

  const groups = groupIssues(issues, {
    parentOf: (designId) => designById.get(designId)?.parentId ?? undefined,
    childrenOf: (designId) =>
      (designById.get(designId)?.childIds ?? []).filter(
        (id) => designById.get(id)?.visibility.visible,
      ),
    direction: (designId) => {
      const direction = designById.get(designId)?.layout.flexDirection;
      return direction === 'row' || direction === 'column' ? direction : undefined;
    },
  });
  const groupOf = new Map<string, string>();
  for (const group of groups) {
    for (const issueId of group.issueIds) {
      // Root-cause groups take precedence over plain element groups.
      if (group.kind === 'likely-root-cause' || !groupOf.has(issueId))
        groupOf.set(issueId, group.id);
    }
  }
  for (const issue of issues) {
    const groupId = groupOf.get(issue.id);
    if (groupId) issue.groupId = groupId;
  }

  const unresolved: UnresolvedComparison[] = [
    ...matches.matches
      .filter((match) => match.ambiguous || match.confidence < MATCH_CONFIDENCE.ambiguous)
      .map((match) => ({
        viewportId: viewport.id,
        side: 'design' as const,
        elementId: match.designId,
        name: designById.get(match.designId)?.name ?? match.designId,
        reason: match.ambiguous ? ('ambiguous' as const) : ('low-confidence' as const),
        candidates: [
          { elementId: match.implementationId, confidence: match.confidence },
          ...match.alternatives.map((alt) => ({
            elementId: alt.implementationId,
            confidence: alt.confidence,
          })),
        ],
      })),
    ...matches.unmatchedDesignIds.map((id) => ({
      viewportId: viewport.id,
      side: 'design' as const,
      elementId: id,
      name: designById.get(id)?.name ?? id,
      reason: 'no-match' as const,
    })),
    ...matches.unmatchedImplementationIds.map((id) => ({
      viewportId: viewport.id,
      side: 'implementation' as const,
      elementId: id,
      name: implementationById.get(id)?.name ?? id,
      reason: 'no-match' as const,
    })),
  ];

  return {
    viewport: {
      viewportId: viewport.id,
      width: viewport.width,
      height: viewport.height,
      designElementCount: design.elements.length,
      implementationElementCount: implementation.elements.length,
      matchedCount: usable.length,
      issueCount: issues.length,
    },
    issues,
    unresolved,
    groups,
  };
}

/** Combines independent viewport comparisons into one report. Viewports are never averaged. */
export function buildReport(
  auditId: string,
  viewports: ViewportComparison[],
  generatedAt = new Date().toISOString(),
): ValidationReport {
  const issues = viewports.flatMap((viewport) => viewport.issues);
  const counts = Object.fromEntries(ISSUE_CATEGORIES.map((category) => [category, 0])) as Record<
    IssueCategory,
    number
  >;
  for (const issue of issues) {
    if (issue.status === 'difference') counts[issue.category] += 1;
  }
  return {
    auditId,
    generatedAt,
    viewports: viewports.map((viewport) => viewport.viewport),
    issues,
    counts,
    unresolved: viewports.flatMap((viewport) => viewport.unresolved),
    groups: viewports.flatMap((viewport) => viewport.groups),
  };
}
