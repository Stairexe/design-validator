import type { DesignElement, ElementMatch, MatchResult } from '@design-validator/design-spec';
import {
  makeElement,
  makeSpec,
  type ElementOverrides,
} from '@design-validator/design-spec/testing';

import { compareViewport } from '../src';

export const viewport = { id: 'desktop', width: 1440, height: 900 };

/** Builds a design/website pair where element `i` in each list is matched to element `i` in the other. */
export function comparePair(
  design: ElementOverrides[],
  website: ElementOverrides[],
  extra: {
    designOnly?: DesignElement[];
    websiteOnly?: DesignElement[];
    matches?: Partial<ElementMatch>[];
    tolerances?: Record<string, number>;
  } = {},
) {
  const frame = makeElement('frame', {
    type: 'frame',
    bounds: { x: 0, y: 0, width: 1440, height: 900 },
  });
  const body = makeElement('body', { bounds: { x: 0, y: 0, width: 1440, height: 900 } });
  const designElements = [
    frame,
    ...design.map((o, i) =>
      makeElement(`d${i}`, { parentId: 'frame', name: `Element ${i}`, ...o }),
    ),
    ...(extra.designOnly ?? []),
  ];
  const siteElements = [
    body,
    ...website.map((o, i) =>
      makeElement(`w${i}`, {
        parentId: 'body',
        source: { provider: 'website', selector: `.el-${i}` },
        ...o,
      }),
    ),
    ...(extra.websiteOnly ?? []),
  ];
  const designSpec = makeSpec('figma', designElements);
  const siteSpec = makeSpec('website', siteElements);
  const matches: MatchResult = {
    matches: [
      {
        designId: 'frame',
        implementationId: 'body',
        confidence: 0.9,
        methods: ['hierarchy'],
        ambiguous: false,
        alternatives: [],
      },
      ...design.map((_, i) => ({
        designId: `d${i}`,
        implementationId: `w${i}`,
        confidence: 0.95,
        methods: ['text' as const],
        ambiguous: false,
        alternatives: [],
        ...extra.matches?.[i],
      })),
    ],
    unmatchedDesignIds: (extra.designOnly ?? []).map((e) => e.id),
    unmatchedImplementationIds: (extra.websiteOnly ?? []).map((e) => e.id),
  };
  const designPage = designSpec.pages[0];
  const sitePage = siteSpec.pages[0];
  if (!designPage || !sitePage) throw new Error('missing page');
  return compareViewport({
    viewport,
    design: designPage,
    implementation: sitePage,
    matches,
    ...(extra.tolerances ? { tolerances: extra.tolerances } : {}),
  });
}
