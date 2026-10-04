import type { DesignElement } from '@design-validator/design-spec';

/** Lowercase, collapse whitespace, drop punctuation (CSS text-transform does not change content). */
export function normalizeText(text: string | undefined): string {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}$€£¥%]+/gu, ' ')
    .trim();
}

function bigrams(value: string): Map<string, number> {
  const grams = new Map<string, number>();
  const compact = value.replace(/\s+/g, ' ');
  for (let i = 0; i < compact.length - 1; i++) {
    const gram = compact.slice(i, i + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
}

/** Sørensen–Dice similarity on character bigrams, in [0, 1]. */
export function textSimilarity(a: string, b: string): number {
  if (a === b) return a.length > 0 ? 1 : 0;
  if (a.length < 2 || b.length < 2) return 0;
  const ga = bigrams(a);
  const gb = bigrams(b);
  let overlap = 0;
  for (const [gram, count] of ga) overlap += Math.min(count, gb.get(gram) ?? 0);
  const total = a.length - 1 + (b.length - 1);
  return total > 0 ? (2 * overlap) / total : 0;
}

const MAX_AGGREGATE = 300;

/**
 * Text a user would read for the element: its own text, or for elements
 * without own text the concatenated text of descendants (a Figma button's
 * label lives in a child layer; a card's text in its children).
 */
export function aggregateText(
  element: DesignElement,
  byId: ReadonlyMap<string, DesignElement>,
): string {
  if (element.text) return normalizeText(element.text);
  const parts: string[] = [];
  const stack = [...element.childIds].reverse();
  let length = 0;
  while (stack.length > 0 && length < MAX_AGGREGATE) {
    const child = byId.get(stack.pop() ?? '');
    if (!child || !child.visibility.visible) continue;
    if (child.text) {
      parts.push(child.text);
      length += child.text.length;
    }
    stack.push(...[...child.childIds].reverse());
  }
  return normalizeText(parts.join(' '));
}
