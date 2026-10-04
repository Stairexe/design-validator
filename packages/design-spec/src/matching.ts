/** Matcher output contract consumed by the comparator. */

export const MATCH_METHODS = [
  'explicit',
  'source-id',
  'semantic-role',
  'text',
  'hierarchy',
  'geometry',
  'visual',
] as const;

export type MatchMethod = (typeof MATCH_METHODS)[number];

export interface MatchCandidate {
  implementationId: string;
  confidence: number;
}

export interface ElementMatch {
  designId: string;
  implementationId: string;
  /** Internal control in [0, 1]; never presented as a quality score. */
  confidence: number;
  methods: MatchMethod[];
  /** True when another candidate scored too close to call. */
  ambiguous: boolean;
  alternatives: MatchCandidate[];
}

export interface MatchResult {
  matches: ElementMatch[];
  unmatchedDesignIds: string[];
  unmatchedImplementationIds: string[];
}

/** User-provided mapping: design element → implementation selector or ID. */
export interface ExplicitMapping {
  designId: string;
  implementationId?: string;
  implementationSelector?: string;
}

/** Confidence thresholds (comparison-engine.md §7). */
export const MATCH_CONFIDENCE = {
  reliable: 0.95,
  usable: 0.8,
  ambiguous: 0.6,
} as const;
