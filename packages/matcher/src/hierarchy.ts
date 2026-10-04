import type { DesignElement } from '@design-validator/design-spec';

/** Set of ancestor IDs for every element, for "is inside" checks. */
export function ancestorIndex(elements: readonly DesignElement[]): Map<string, Set<string>> {
  const byId = new Map(elements.map((element) => [element.id, element]));
  const index = new Map<string, Set<string>>();
  const resolve = (element: DesignElement): Set<string> => {
    const cached = index.get(element.id);
    if (cached) return cached;
    const parent = element.parentId ? byId.get(element.parentId) : undefined;
    const ancestors = parent ? new Set([parent.id, ...resolve(parent)]) : new Set<string>();
    index.set(element.id, ancestors);
    return ancestors;
  };
  for (const element of elements) resolve(element);
  return index;
}

/**
 * Hierarchy agreement in [0, 1] given current parent matches: 1 when the
 * candidate sits inside the implementation element matched to the design
 * element's parent, 0 when it sits outside, null when the parent is unmatched.
 */
export function hierarchyScore(
  design: DesignElement,
  implementationId: string,
  parentMatches: ReadonlyMap<string, string>,
  implementationAncestors: ReadonlyMap<string, Set<string>>,
): number | null {
  if (!design.parentId) return null;
  const parentImplementation = parentMatches.get(design.parentId);
  if (!parentImplementation) return null;
  if (parentImplementation === implementationId) return 0.5;
  return implementationAncestors.get(implementationId)?.has(parentImplementation) ? 1 : 0;
}
