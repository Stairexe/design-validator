import type { DesignElement, DesignPage, MatchResult } from '@design-validator/design-spec';

import { keyword, type IssueDraft } from './context';

const normalizeText = (text: string | undefined) =>
  (text ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const IMPORTANT = new Set(['button', 'text', 'image', 'input', 'link', 'icon']);

function isMeaningful(element: DesignElement): boolean {
  return (
    IMPORTANT.has(element.type) ||
    Boolean(element.text) ||
    Boolean(element.colors.background) ||
    (element.border.width.top ?? 0) > 0
  );
}

/** Keeps only the top-most element of each unmatched subtree. */
function topMost(ids: readonly string[], byId: ReadonlyMap<string, DesignElement>): string[] {
  const set = new Set(ids);
  return ids.filter((id) => {
    let parent = byId.get(id)?.parentId;
    while (parent) {
      if (set.has(parent)) return false;
      parent = byId.get(parent)?.parentId;
    }
    return true;
  });
}

const reference = (side: 'design' | 'implementation', element: DesignElement) =>
  side === 'design'
    ? { designId: element.id, name: element.name ?? element.id, designBounds: element.bounds }
    : {
        implementationId: element.id,
        name: element.name ?? element.id,
        implementationBounds: element.bounds,
        ...(element.source.selector ? { selector: element.source.selector } : {}),
      };

/**
 * Missing and extra elements (comparison-engine.md §9), with responsive
 * visibility mismatches split out: an element hidden at this viewport is a
 * visibility difference, not a missing element.
 */
export function compareStructure(
  viewportId: string,
  design: DesignPage,
  implementation: DesignPage,
  result: MatchResult,
): IssueDraft[] {
  const designById = new Map(design.elements.map((element) => [element.id, element]));
  const implById = new Map(implementation.elements.map((element) => [element.id, element]));
  const issues: IssueDraft[] = [];
  const hiddenImplByText = new Map(
    implementation.elements
      .filter((element) => !element.visibility.visible && element.text)
      .map((element) => [normalizeText(element.text), element]),
  );
  const hiddenDesignByText = new Map(
    design.elements
      .filter((element) => !element.visibility.visible && element.text)
      .map((element) => [normalizeText(element.text), element]),
  );

  for (const id of topMost(result.unmatchedDesignIds, designById)) {
    const element = designById.get(id);
    if (!element || !isMeaningful(element)) continue;
    const hidden = element.text ? hiddenImplByText.get(normalizeText(element.text)) : undefined;
    if (hidden) {
      issues.push({
        viewportId,
        category: 'responsive',
        severity: 'high',
        element: {
          ...reference('design', element),
          ...reference('implementation', hidden),
          name: element.name ?? hidden.name ?? id,
        },
        property: 'visibility',
        current: keyword(`hidden (${hidden.visibility.reason ?? 'not rendered'})`),
        required: keyword('visible'),
        tolerance: 0,
        status: 'difference',
        evidence: {
          notes: ['The element exists in the page but is not rendered at this viewport.'],
        },
      });
      continue;
    }
    issues.push({
      viewportId,
      category: 'structure',
      severity:
        element.type === 'button' || element.type === 'text' || element.type === 'input'
          ? 'high'
          : 'medium',
      element: reference('design', element),
      property: 'structure.presence',
      current: { kind: 'none' },
      required: keyword('present'),
      tolerance: 0,
      status: 'difference',
      evidence: { notes: ['No reliable implementation match was found for this design element.'] },
    });
  }

  for (const id of topMost(result.unmatchedImplementationIds, implById)) {
    const element = implById.get(id);
    if (!element) continue;
    const hidden = element.text ? hiddenDesignByText.get(normalizeText(element.text)) : undefined;
    issues.push(
      hidden
        ? {
            viewportId,
            category: 'responsive',
            severity: 'high',
            element: {
              ...reference('implementation', element),
              designId: hidden.id,
              name: hidden.name ?? element.name ?? id,
            },
            property: 'visibility',
            current: keyword('visible'),
            required: keyword('hidden'),
            tolerance: 0,
            status: 'difference',
            evidence: { notes: ['The design hides this element at this viewport.'] },
          }
        : {
            viewportId,
            category: 'structure',
            severity: element.type === 'button' || Boolean(element.text) ? 'medium' : 'low',
            element: reference('implementation', element),
            property: 'structure.presence',
            current: keyword('present'),
            required: { kind: 'none' },
            tolerance: 0,
            status: 'difference',
            evidence: { notes: ['This implementation element has no counterpart in the design.'] },
          },
    );
  }

  issues.push(
    ...compareRepeatedCounts(viewportId, design, implementation, result, designById, implById),
  );
  return issues;
}

const designSignature = (element: DesignElement) =>
  element.source.attributes?.['component'] ?? element.name ?? element.type;
const implSignature = (element: DesignElement) =>
  `${element.source.originalType ?? element.type}.${element.source.classNames?.[0] ?? ''}`;

/** "Design: 3 card instances, Website: 4 cards" → one count difference on the parent. */
function compareRepeatedCounts(
  viewportId: string,
  design: DesignPage,
  implementation: DesignPage,
  result: MatchResult,
  designById: ReadonlyMap<string, DesignElement>,
  implById: ReadonlyMap<string, DesignElement>,
): IssueDraft[] {
  const matchByDesign = new Map(
    result.matches.filter((m) => !m.ambiguous).map((m) => [m.designId, m.implementationId]),
  );
  const issues: IssueDraft[] = [];
  for (const parent of design.elements) {
    const implParent = implById.get(matchByDesign.get(parent.id) ?? '');
    if (!implParent) continue;
    const groups = new Map<string, DesignElement[]>();
    for (const child of parent.childIds.map((id) => designById.get(id))) {
      if (!child?.visibility.visible) continue;
      const signature = designSignature(child);
      groups.set(signature, [...(groups.get(signature) ?? []), child]);
    }
    for (const [signature, children] of groups) {
      if (children.length < 2) continue;
      const matched = children
        .map((child) => implById.get(matchByDesign.get(child.id) ?? ''))
        .filter((e): e is DesignElement => Boolean(e));
      const sample = matched[0];
      if (!sample) continue;
      const implCount = implParent.childIds
        .map((id) => implById.get(id))
        .filter(
          (child) => child?.visibility.visible && implSignature(child) === implSignature(sample),
        ).length;
      if (implCount === children.length) continue;
      issues.push({
        viewportId,
        category: 'structure',
        severity: 'high',
        element: {
          designId: parent.id,
          implementationId: implParent.id,
          name: `${parent.name ?? parent.id} / ${signature}`,
          ...(implParent.source.selector ? { selector: implParent.source.selector } : {}),
        },
        property: 'structure.count',
        current: { kind: 'count', value: implCount },
        required: { kind: 'count', value: children.length },
        delta: { kind: 'count', value: children.length - implCount },
        tolerance: 0,
        status: 'difference',
        evidence: {
          notes: [
            `Design repeats "${signature}" ${children.length}×; the implementation renders ${implCount}.`,
          ],
        },
      });
    }
  }
  return issues;
}
