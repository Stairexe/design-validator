import { describe, expect, it } from 'vitest';

import {
  DESIGN_SPEC_SCHEMA_VERSION,
  DesignSpecValidationError,
  parseDesignSpec,
  validateDesignSpec,
  type DesignSpec,
} from '../src';
import { makeElement, makeSpec } from '../src/testing';

/** One spec exercising every concept Phase 1 must represent. */
function representativeSpec(): DesignSpec {
  return makeSpec('figma', [
    makeElement('frame', { type: 'frame', role: 'section', bounds: { x: 0, y: 0, width: 1440, height: 900 } }),
    makeElement('card', {
      type: 'container',
      role: 'card',
      parentId: 'frame',
      layout: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
      spacing: { padding: { top: 24, right: 24, bottom: 24, left: 24 }, gap: 16 },
      colors: { background: { hex: '#ffffff', alpha: 1 } },
      border: { width: { top: 1, right: 1, bottom: 1, left: 1 }, style: 'solid', color: { hex: '#e4e4e7', alpha: 1 } },
      radius: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 },
      effects: { shadows: [{ x: 0, y: 4, blur: 12, spread: 0, color: { hex: '#000000', alpha: 0.1 }, inset: false }], opacity: 1 },
      responsive: { visibilityByViewport: { desktop: true, mobile: false } },
    }),
    makeElement('heading', {
      type: 'text',
      role: 'heading',
      parentId: 'card',
      text: 'Pricing',
      typography: { fontFamily: 'Inter', fontSize: 48, fontWeight: 700, lineHeight: 56, letterSpacing: -0.5, color: { hex: '#000000', alpha: 1 } },
    }),
    makeElement('cta', { type: 'button', role: 'button', parentId: 'card', text: 'Buy', spacing: { padding: { top: 12, right: 24, bottom: 12, left: 24 } } }),
    makeElement('hero', { type: 'image', role: 'image', parentId: 'card' }),
    makeElement('body', { type: 'text', role: 'paragraph', parentId: 'card', typography: { lineHeight: 'normal' } }),
    makeElement('unresolved', { parentId: 'card', spacing: { margin: { top: null, right: 0, bottom: null, left: 0 } } }),
  ]);
}

describe('designSpecSchema', () => {
  it('accepts a representative spec covering every supported concept', () => {
    const spec = representativeSpec();
    expect(parseDesignSpec(spec)).toEqual(spec);
    expect(spec.schemaVersion).toBe(DESIGN_SPEC_SCHEMA_VERSION);
  });

  it('accepts website and design specs with the same shape', () => {
    const website = makeSpec('website', [makeElement('a')]);
    expect(validateDesignSpec(website).success).toBe(true);
  });

  it('rejects non-canonical colours', () => {
    const spec = representativeSpec();
    const card = spec.pages[0]?.elements[1];
    if (card) card.colors.background = { hex: '#FFF', alpha: 1 };
    const result = validateDesignSpec(spec);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.join()).toContain('#rrggbb');
  });

  it('rejects broken hierarchy references and duplicates', () => {
    const spec = makeSpec('website', [makeElement('a'), makeElement('a')]);
    const page = spec.pages[0];
    if (page) page.rootIds.push('ghost');
    const result = validateDesignSpec(spec);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.join('\n')).toMatch(/duplicate element id a/);
      expect(result.issues.join('\n')).toMatch(/unknown element id ghost/);
    }
  });

  it('rejects other schema versions and throws a typed error', () => {
    expect(() => parseDesignSpec({ ...representativeSpec(), schemaVersion: '9.9.9' })).toThrow(DesignSpecValidationError);
  });

  it('rejects raw payloads in rawReference', () => {
    const spec = makeSpec('website', [makeElement('a', { source: { provider: 'website', rawReference: 'x'.repeat(5000) } })]);
    expect(validateDesignSpec(spec).success).toBe(false);
  });
});
