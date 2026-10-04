/**
 * Builders for tests and fixtures in any package. Not used at runtime.
 */
import type { DesignElement, DesignPage, DesignSourceType, DesignSpec } from './types';
import { DESIGN_SPEC_SCHEMA_VERSION } from './version';

const zeroBox = () => ({ top: 0, right: 0, bottom: 0, left: 0 });

export type ElementOverrides = Partial<Omit<DesignElement, 'id'>>;

export function makeElement(
  id: string,
  overrides: ElementOverrides = {},
  provider: DesignSourceType = 'website',
): DesignElement {
  return {
    id,
    type: 'container',
    parentId: null,
    childIds: [],
    bounds: { x: 0, y: 0, width: 100, height: 40 },
    visibility: { visible: true },
    layout: {},
    spacing: {},
    colors: {},
    border: { width: zeroBox() },
    radius: {},
    effects: {},
    source: { provider },
    ...overrides,
  };
}

/** Builds a single-page spec, wiring `parentId`/`childIds`/`rootIds` from `parentId`s. */
export function makeSpec(
  type: DesignSourceType,
  elements: DesignElement[],
  page: Partial<Omit<DesignPage, 'elements' | 'rootIds'>> = {},
): DesignSpec {
  const linked = elements.map((element) => ({
    ...element,
    childIds: elements.filter((e) => e.parentId === element.id).map((e) => e.id),
    source: { ...element.source, provider: type },
  }));
  return {
    schemaVersion: DESIGN_SPEC_SCHEMA_VERSION,
    source: { type },
    document: { id: `${type}-doc`, name: `${type} document`, width: 1440, height: 900 },
    viewports: [{ id: 'desktop', width: 1440, height: 900 }],
    pages: [
      {
        id: page.id ?? `${type}-page`,
        name: page.name ?? 'Page',
        viewportId: page.viewportId ?? 'desktop',
        width: page.width ?? 1440,
        height: page.height ?? 900,
        rootIds: linked.filter((e) => !e.parentId).map((e) => e.id),
        elements: linked,
      },
    ],
    metadata: {},
  };
}
