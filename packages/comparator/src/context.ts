import type {
  ComparisonTolerances,
  DesignElement,
  ElementMatch,
  IssueCategory,
  IssueDelta,
  IssueSeverity,
  NormalizedValue,
  ValidationIssue,
} from '@design-validator/design-spec';

/** Everything a property comparator needs for one matched pair. */
export interface PairContext {
  viewportId: string;
  design: DesignElement;
  implementation: DesignElement;
  match: ElementMatch;
  /** Design → implementation geometry scale (viewport width / frame width). */
  scale: number;
  tolerances: ComparisonTolerances;
  designById: ReadonlyMap<string, DesignElement>;
  implementationById: ReadonlyMap<string, DesignElement>;
  /** design ID → implementation ID */
  matchByDesign: ReadonlyMap<string, string>;
  /** True when this design element shares its implementation element with its parent (e.g. a button label). */
  sharesParentImplementation: boolean;
}

/** Issue fields a comparator decides; the engine fills in identity and references. */
export interface Finding {
  category: IssueCategory;
  property: string;
  current: NormalizedValue;
  required: NormalizedValue;
  delta?: IssueDelta;
  tolerance: number;
  severity: IssueSeverity;
  notes?: string[];
}

export type PropertyComparator = (context: PairContext) => Finding[];

export type IssueDraft = Omit<ValidationIssue, 'id' | 'recommendation' | 'groupId'>;

export const length = (value: number): NormalizedValue => ({ kind: 'length', value: round(value) });
export const keyword = (value: string): NormalizedValue => ({ kind: 'keyword', value });
export const round = (value: number) => Math.round(value * 100) / 100;

/** Severity for a px difference: practical visibility, not a score. */
export function lengthSeverity(delta: number, high = 8, medium = 4): IssueSeverity {
  const size = Math.abs(delta);
  if (size >= high) return 'high';
  if (size >= medium) return 'medium';
  return 'low';
}

/**
 * Compares two px values. Returns a finding only when both are known and the
 * difference exceeds the tolerance. Unknown (`null`) values are never compared.
 */
export function compareLength(
  category: IssueCategory,
  property: string,
  current: number | null | undefined,
  required: number | null | undefined,
  tolerance: number,
  severity: (delta: number) => IssueSeverity = (delta) => lengthSeverity(delta),
): Finding | null {
  if (current == null || required == null) return null;
  const delta = round(required - current);
  if (Math.abs(delta) <= tolerance) return null;
  return {
    category,
    property,
    current: length(current),
    required: length(required),
    delta: { kind: 'length', value: delta },
    tolerance,
    severity: severity(delta),
  };
}

export function compareKeyword(
  category: IssueCategory,
  property: string,
  current: string | null | undefined,
  required: string | null | undefined,
  severity: IssueSeverity,
  normalize: (value: string) => string = (value) => value.toLowerCase(),
): Finding | null {
  if (!current || !required) return null;
  if (normalize(current) === normalize(required)) return null;
  return {
    category,
    property,
    current: keyword(current),
    required: keyword(required),
    tolerance: 0,
    severity,
  };
}
