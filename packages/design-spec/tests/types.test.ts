import { describe, expect, expectTypeOf, it } from 'vitest';

import { DESIGN_SPEC_SCHEMA_VERSION } from '../src';
import type { DesignElement, DesignSpec, DesignSourceType } from '../src';

const zeroBox = { top: 0, right: 0, bottom: 0, left: 0 };

function buttonElement(provider: DesignSourceType): DesignElement {
  return {
    id: 'cta',
    name: 'Primary CTA',
    type: 'button',
    role: 'button',
    parentId: null,
    childIds: [],
    text: 'Get started',
    bounds: { x: 0, y: 0, width: 160, height: 48 },
    visibility: { visible: true },
    layout: { display: 'flex' },
    spacing: { padding: { top: 12, right: 24, bottom: 12, left: 24 } },
    typography: { fontFamily: 'Inter', fontSize: 16, fontWeight: 600, lineHeight: 24 },
    colors: { background: { hex: '#000000', alpha: 1 } },
    border: { width: zeroBox },
    radius: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 },
    effects: { opacity: 1 },
    source: { provider },
  };
}

function specFor(type: DesignSourceType): DesignSpec {
  return {
    schemaVersion: DESIGN_SPEC_SCHEMA_VERSION,
    source: { type },
    document: { id: 'doc', name: 'Pricing' },
    viewports: [{ id: 'desktop', width: 1440, height: 900 }],
    pages: [{ id: 'page', name: 'Pricing', rootIds: ['cta'], elements: [buttonElement(type)] }],
    metadata: {},
  };
}

describe('DesignSpec contract', () => {
  it('exposes a semantic schema version', () => {
    expect(DESIGN_SPEC_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('represents website and design sources with the same shape', () => {
    const website = specFor('website');
    const figma = specFor('figma');

    expectTypeOf(website).toEqualTypeOf(figma);
    expect(website.pages[0]?.elements[0]?.spacing).toEqual(figma.pages[0]?.elements[0]?.spacing);
  });

  it('only allows the documented source types', () => {
    expectTypeOf<DesignSourceType>().toEqualTypeOf<'website' | 'figma' | 'adobe-xd'>();
  });
});
