import type { DesignElement, DesignRole } from '@design-validator/design-spec';

const COMPATIBLE: Partial<Record<DesignRole, DesignRole[]>> = {
  button: ['link'],
  link: ['button'],
  heading: ['paragraph', 'label'],
  paragraph: ['heading', 'label', 'link'],
  label: ['paragraph', 'heading'],
  card: ['container', 'section'],
  container: ['card', 'section', 'navigation'],
  section: ['container', 'card', 'navigation'],
  navigation: ['container', 'section'],
};

const TEXTUAL = new Set(['text']);
const LEAF_VISUAL = new Set(['image', 'icon']);

/** Semantic compatibility in [0, 1] from roles and element types. */
export function semanticScore(design: DesignElement, implementation: DesignElement): number {
  const dr = design.role ?? 'unknown';
  const ir = implementation.role ?? 'unknown';
  let score: number;
  if (dr === ir && dr !== 'unknown') score = 1;
  else if (COMPATIBLE[dr]?.includes(ir)) score = 0.6;
  else if (dr === 'unknown' || ir === 'unknown') score = 0.4;
  else score = 0.1;

  // Text layers should land on elements that render text; images on images.
  if (TEXTUAL.has(design.type) && !implementation.text) score *= 0.5;
  if (LEAF_VISUAL.has(design.type) !== LEAF_VISUAL.has(implementation.type)) score *= 0.5;
  return score;
}
