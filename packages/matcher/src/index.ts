import {
  MATCH_CONFIDENCE,
  type DesignElement,
  type DesignPage,
  type ElementMatch,
  type ExplicitMapping,
  type MatchCandidate,
  type MatchMethod,
  type MatchResult,
} from '@design-validator/design-spec';

import { combine } from './confidence';
import { explicitMatches } from './explicit';
import { geometryScore, isNearby } from './geometry';
import { ancestorIndex, hierarchyScore } from './hierarchy';
import { semanticScore } from './semantic';
import { aggregateText, normalizeText, textSimilarity } from './text';
import { visualScore } from './visual';

export { normalizeText, textSimilarity } from './text';

export interface MatchOptions {
  explicitMappings?: ExplicitMapping[];
  /** Implementation viewport width; design frames are scaled to it. Defaults to the implementation page width. */
  viewportWidth?: number;
  /** Below this confidence a pair is never presented as a match. */
  minConfidence?: number;
  /** A runner-up within this margin of the winner marks the match ambiguous. */
  ambiguityMargin?: number;
}

interface Candidate {
  design: DesignElement;
  implementation: DesignElement;
  confidence: number;
  methods: MatchMethod[];
}

const MEANINGFUL_TYPES = new Set(['button', 'image', 'icon', 'input', 'link', 'text']);
const MAX_PASSES = 4;

const isRendered = (element: DesignElement) =>
  element.visibility.visible && element.bounds.width > 0 && element.bounds.height > 0;

/** An implementation element worth reporting as "extra" when unmatched (not every wrapper div). */
function isMeaningful(element: DesignElement): boolean {
  return (
    Boolean(element.text) ||
    MEANINGFUL_TYPES.has(element.type) ||
    Boolean(element.colors.background) ||
    (element.border.style !== 'none' && (element.border.width.top ?? 0) > 0)
  );
}

/**
 * Deterministically matches design elements to implementation elements for
 * one page/viewport. Same inputs always yield the same result.
 */
export function matchElements(
  design: DesignPage,
  implementation: DesignPage,
  options: MatchOptions = {},
): MatchResult {
  const minConfidence = options.minConfidence ?? MATCH_CONFIDENCE.ambiguous;
  const margin = options.ambiguityMargin ?? 0.05;
  const designById = new Map(design.elements.map((element) => [element.id, element]));
  const implById = new Map(implementation.elements.map((element) => [element.id, element]));

  const designRoot = design.elements.find((element) => !element.parentId);
  const implRoot = implementation.elements.find((element) => !element.parentId);
  const designWidth = designRoot?.bounds.width || design.width || 1;
  const viewportWidth =
    options.viewportWidth ?? implementation.width ?? implRoot?.bounds.width ?? designWidth;
  const scale = viewportWidth / designWidth;

  const designCandidates = design.elements.filter(
    (element) => element !== designRoot && isRendered(element),
  );
  const implCandidates = implementation.elements.filter(
    (element) => element !== implRoot && isRendered(element),
  );

  const designText = new Map(
    designCandidates.map((element) => [element.id, aggregateText(element, designById)]),
  );
  const implText = new Map(
    implCandidates.map((element) => [element.id, aggregateText(element, implById)]),
  );
  const implByText = new Map<string, DesignElement[]>();
  for (const element of implCandidates) {
    const text = implText.get(element.id) ?? '';
    if (text) implByText.set(text, [...(implByText.get(text) ?? []), element]);
  }
  const implAncestors = ancestorIndex(implementation.elements);

  const matches = new Map<string, ElementMatch>();
  const used = new Set<string>();
  const accept = (match: ElementMatch) => {
    matches.set(match.designId, match);
    used.add(match.implementationId);
  };

  if (designRoot && implRoot) {
    accept({
      designId: designRoot.id,
      implementationId: implRoot.id,
      confidence: 0.9,
      methods: ['hierarchy'],
      ambiguous: false,
      alternatives: [],
    });
  }
  for (const explicit of explicitMatches(
    designCandidates,
    implCandidates,
    options.explicitMappings ?? [],
  )) {
    if (matches.has(explicit.designId) || used.has(explicit.implementationId)) continue;
    accept({
      designId: explicit.designId,
      implementationId: explicit.implementationId,
      confidence: explicit.method === 'explicit' ? 1 : 0.98,
      methods: [explicit.method],
      ambiguous: false,
      alternatives: [],
    });
  }

  const score = (
    d: DesignElement,
    i: DesignElement,
    parentMatches: ReadonlyMap<string, string>,
  ): Candidate => {
    const dt = designText.get(d.id) ?? '';
    const it = implText.get(i.id) ?? '';
    const text = dt && it ? textSimilarity(dt, it) : dt || it ? 0 : null;
    const { confidence, methods } = combine({
      semantic: semanticScore(d, i),
      text: dt ? text : it && d.type === 'text' ? 0 : null,
      hierarchy: hierarchyScore(d, i.id, parentMatches, implAncestors),
      geometry: geometryScore(d.bounds, i.bounds, scale, viewportWidth),
      visual: visualScore(d, i),
    });
    return { design: d, implementation: i, confidence, methods };
  };

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const parentMatches = new Map(
      [...matches.values()].map((m) => [m.designId, m.implementationId]),
    );
    const candidates: Candidate[] = [];
    for (const d of designCandidates) {
      if (matches.has(d.id)) continue;
      const pool = new Set<DesignElement>(implByText.get(designText.get(d.id) ?? '') ?? []);
      for (const i of implCandidates) {
        if (!used.has(i.id) && isNearby(d.bounds, i.bounds, scale, viewportWidth)) pool.add(i);
      }
      for (const i of pool) {
        if (used.has(i.id)) continue;
        const candidate = score(d, i, parentMatches);
        if (candidate.confidence >= minConfidence * 0.75) candidates.push(candidate);
      }
    }
    // Deterministic order: confidence, then document order on both sides.
    const designOrder = new Map(design.elements.map((element, index) => [element.id, index]));
    const implOrder = new Map(implementation.elements.map((element, index) => [element.id, index]));
    candidates.sort(
      (a, b) =>
        b.confidence - a.confidence ||
        (designOrder.get(a.design.id) ?? 0) - (designOrder.get(b.design.id) ?? 0) ||
        (implOrder.get(a.implementation.id) ?? 0) - (implOrder.get(b.implementation.id) ?? 0),
    );

    // First pass only takes strong anchors so later passes can use their hierarchy.
    const threshold = pass === 0 ? MATCH_CONFIDENCE.usable + 0.05 : minConfidence;
    const byDesign = new Map<string, Candidate[]>();
    for (const candidate of candidates) {
      byDesign.set(candidate.design.id, [...(byDesign.get(candidate.design.id) ?? []), candidate]);
    }
    let added = 0;
    for (const candidate of candidates) {
      if (candidate.confidence < threshold) break;
      if (matches.has(candidate.design.id) || used.has(candidate.implementation.id)) continue;
      const alternatives: MatchCandidate[] = (byDesign.get(candidate.design.id) ?? [])
        .filter((other) => other !== candidate && !used.has(other.implementation.id))
        .slice(0, 3)
        .map((other) => ({
          implementationId: other.implementation.id,
          confidence: other.confidence,
        }));
      const ambiguous = alternatives.some((alt) => alt.confidence >= candidate.confidence - margin);
      accept({
        designId: candidate.design.id,
        implementationId: candidate.implementation.id,
        confidence: candidate.confidence,
        methods: candidate.methods,
        ambiguous,
        alternatives,
      });
      added++;
    }
    if (pass > 0 && added === 0) break;
  }

  // A design text layer inside a matched component (e.g. a button label) maps to the
  // matched implementation element when that element itself owns the same text.
  for (const d of designCandidates) {
    if (matches.has(d.id) || d.type !== 'text' || !d.parentId) continue;
    const parentImpl = matches.get(d.parentId)?.implementationId;
    const impl = parentImpl ? implById.get(parentImpl) : undefined;
    if (impl?.text && normalizeText(impl.text) === normalizeText(d.text)) {
      matches.set(d.id, {
        designId: d.id,
        implementationId: impl.id,
        confidence: 0.9,
        methods: ['hierarchy', 'text'],
        ambiguous: false,
        alternatives: [],
      });
    }
  }

  const ordered = design.elements
    .map((element) => matches.get(element.id))
    .filter((m): m is ElementMatch => Boolean(m));
  return {
    matches: ordered,
    unmatchedDesignIds: designCandidates
      .filter((element) => !matches.has(element.id))
      .map((element) => element.id),
    unmatchedImplementationIds: implCandidates
      .filter((element) => !used.has(element.id) && isMeaningful(element))
      .filter((element) => ![...matches.values()].some((m) => m.implementationId === element.id))
      .map((element) => element.id),
  };
}
