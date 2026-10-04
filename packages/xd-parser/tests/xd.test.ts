import { readFileSync } from 'node:fs';
import path from 'node:path';

import { validateDesignSpec } from '@design-validator/design-spec';
import { describe, expect, it } from 'vitest';

import { XdManifestError, validateXdManifest, xdManifestToDesignSpec } from '../src';

const fixture: unknown = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../../../fixtures/xd/pricing.manifest.json'),
    'utf8',
  ),
);

describe('validateXdManifest', () => {
  it('accepts the fixture manifest', () => {
    expect(validateXdManifest(fixture).artboards).toHaveLength(1);
  });

  it.each([
    [{}, 'manifestVersion'],
    [
      {
        manifestVersion: '9.0',
        generator: { name: 'x', version: '1' },
        document: { name: 'd' },
        artboards: [],
      },
      'manifestVersion',
    ],
    [
      {
        manifestVersion: '1.0',
        generator: { name: 'x', version: '1' },
        document: { name: 'd' },
        artboards: [],
      },
      'no artboards',
    ],
  ])('rejects invalid manifests (%#)', (input, message) => {
    expect(() => validateXdManifest(input)).toThrow(XdManifestError);
    expect(() => validateXdManifest(input)).toThrow(message);
  });
});

describe('xdManifestToDesignSpec', () => {
  const manifest = validateXdManifest(fixture);
  const spec = xdManifestToDesignSpec(manifest, [
    { artboardGuid: 'ab-desktop', viewport: { id: 'desktop', width: 1440, height: 900 } },
  ]);
  const byId = (id: string) => spec.pages[0]?.elements.find((element) => element.id === id);

  it('produces a valid adobe-xd DesignSpec', () => {
    expect(validateDesignSpec(spec).success).toBe(true);
    expect(spec.source).toMatchObject({ type: 'adobe-xd', name: 'Pricing.xd', version: '1.0' });
    expect(spec.pages[0]).toMatchObject({
      id: 'ab-desktop',
      viewportId: 'desktop',
      rootIds: ['ab-desktop'],
    });
  });

  it('normalizes text: char spacing (1/1000 em) to px and font style to weight', () => {
    expect(byId('hero-title')).toMatchObject({
      type: 'text',
      role: 'heading',
      typography: {
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 700,
        lineHeight: 56,
        letterSpacing: -0.5,
        color: { hex: '#111111', alpha: 1 },
      },
    });
    expect(byId('cta-label')?.typography?.fontWeight).toBe(600);
  });

  it('maps stacks and padding to spacing and symbols to buttons', () => {
    expect(byId('cta')).toMatchObject({
      type: 'button',
      role: 'button',
      spacing: { padding: { top: 12, right: 24, bottom: 12, left: 24 }, gap: 8, columnGap: 8 },
      radius: { topLeft: 12 },
      colors: { background: { hex: '#111111', alpha: 1 } },
      source: { provider: 'adobe-xd', attributes: { component: 'Button' } },
    });
    expect(byId('cards')?.spacing.gap).toBe(24);
    expect(byId('card-1')).toMatchObject({
      role: 'card',
      border: { style: 'solid', width: { top: 1 } },
      effects: { shadows: [{ y: 4, blur: 12 }] },
    });
  });

  it('rejects unknown artboards', () => {
    expect(() => xdManifestToDesignSpec(manifest, [{ artboardGuid: 'nope' }])).toThrow(
      XdManifestError,
    );
  });
});
