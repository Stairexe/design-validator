import type { MatchMethod } from '@design-validator/design-spec';

export interface Evidence {
  semantic: number;
  text: number | null;
  hierarchy: number | null;
  geometry: number;
  visual: number | null;
}

const WEIGHTS = { semantic: 0.2, text: 0.35, hierarchy: 0.15, geometry: 0.2, visual: 0.1 } as const;

/**
 * Weighted mean over the evidence that is available. Missing signals (no
 * text on either side, unmatched parent) are excluded rather than counted as 0.
 * Strong exact text agreement raises the floor because text is the most
 * specific signal designers and developers share.
 */
export function combine(evidence: Evidence): { confidence: number; methods: MatchMethod[] } {
  let total = 0;
  let weight = 0;
  const add = (value: number | null, w: number) => {
    if (value === null) return;
    total += value * w;
    weight += w;
  };
  add(evidence.semantic, WEIGHTS.semantic);
  add(evidence.text, WEIGHTS.text);
  add(evidence.hierarchy, WEIGHTS.hierarchy);
  add(evidence.geometry, WEIGHTS.geometry);
  add(evidence.visual, WEIGHTS.visual);
  let confidence = weight > 0 ? total / weight : 0;
  if (evidence.text === 1 && evidence.semantic >= 0.6) confidence = Math.max(confidence, 0.9);

  const methods: MatchMethod[] = [];
  if (evidence.semantic >= 0.6) methods.push('semantic-role');
  if ((evidence.text ?? 0) >= 0.8) methods.push('text');
  if ((evidence.hierarchy ?? 0) >= 1) methods.push('hierarchy');
  if (evidence.geometry >= 0.6) methods.push('geometry');
  if ((evidence.visual ?? 0) >= 0.8) methods.push('visual');
  return { confidence: Math.round(Math.min(1, confidence) * 1000) / 1000, methods };
}
