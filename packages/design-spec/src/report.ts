import type { Bounds, ColorValue, ShadowValue } from './types';

/**
 * Comparison output contract (comparison-engine.md). Lives in design-spec so
 * the comparator, AI layer, persistence and UI share one definition without
 * depending on each other.
 */

export const ISSUE_CATEGORIES = [
  'position',
  'size',
  'spacing',
  'typography',
  'color',
  'border',
  'radius',
  'effect',
  'layout',
  'responsive',
  'structure',
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;

export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export type IssueStatus = 'difference' | 'within-tolerance' | 'unresolved';

/**
 * A measured value with its kind preserved. Display strings are always
 * derived from this (see `format.ts`); they are never the source of truth.
 */
export type NormalizedValue =
  | { kind: 'length'; value: number }
  | { kind: 'number'; value: number }
  | { kind: 'color'; value: ColorValue }
  | { kind: 'keyword'; value: string }
  | { kind: 'shadow'; value: ShadowValue[] }
  | { kind: 'count'; value: number }
  | { kind: 'none' };

export type IssueDelta =
  | { kind: 'length'; value: number }
  | { kind: 'number'; value: number }
  | { kind: 'count'; value: number }
  /** CIE76 ΔE between the two colours. */
  | { kind: 'color-distance'; value: number };

export interface IssueElementReference {
  designId?: string;
  implementationId?: string;
  name: string;
  selector?: string;
  designPath?: string;
  designBounds?: Bounds;
  implementationBounds?: Bounds;
}

export interface IssueEvidence {
  matchConfidence?: number;
  matchMethods?: string[];
  notes?: string[];
}

export interface Recommendation {
  source: 'deterministic' | 'ai';
  text?: string;
  code?: string;
  confidence?: number;
}

export interface ValidationIssue {
  /** Deterministic: identical inputs produce identical IDs. */
  id: string;
  viewportId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  element: IssueElementReference;
  /** Property path, e.g. `padding.left`, `padding.inline`, `typography.fontSize`. */
  property: string;
  /** Implementation (website) value. */
  current: NormalizedValue;
  /** Design value. */
  required: NormalizedValue;
  /** `required - current` for numeric kinds: the change to apply. */
  delta?: IssueDelta;
  tolerance: number;
  status: IssueStatus;
  evidence: IssueEvidence;
  groupId?: string;
  recommendation?: Recommendation;
}

export type UnresolvedReason = 'no-match' | 'ambiguous' | 'low-confidence';

export interface UnresolvedComparison {
  viewportId: string;
  side: 'design' | 'implementation';
  elementId: string;
  name: string;
  reason: UnresolvedReason;
  candidates?: { elementId: string; confidence: number }[];
}

export interface IssueGroup {
  id: string;
  viewportId: string;
  kind: 'element' | 'likely-root-cause';
  label: string;
  issueIds: string[];
  /** For root-cause groups: the issue whose fix likely resolves the rest. */
  rootIssueId?: string;
}

export interface ViewportReport {
  viewportId: string;
  width: number;
  height: number;
  designElementCount: number;
  implementationElementCount: number;
  matchedCount: number;
  issueCount: number;
}

export interface ValidationReport {
  auditId: string;
  generatedAt: string;
  viewports: ViewportReport[];
  issues: ValidationIssue[];
  /** Counts of `difference` issues per category: navigation aid, not a score. */
  counts: Record<IssueCategory, number>;
  unresolved: UnresolvedComparison[];
  groups: IssueGroup[];
}

/** Configurable tolerances (comparison-engine.md §5). Engineering defaults. */
export interface ComparisonTolerances {
  positionPx: number;
  sizePx: number;
  spacingPx: number;
  typographyPx: number;
  /** Maximum ΔE treated as equal. 0 means exact after normalization. */
  colorDelta: number;
  radiusPx: number;
  borderPx: number;
  opacity: number;
}

export const DEFAULT_TOLERANCES: ComparisonTolerances = {
  positionPx: 2,
  sizePx: 2,
  spacingPx: 2,
  typographyPx: 1,
  colorDelta: 0,
  radiusPx: 1,
  borderPx: 0.5,
  opacity: 0.01,
};
