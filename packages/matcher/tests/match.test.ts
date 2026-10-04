import type { DesignPage } from '@design-validator/design-spec';
import { makeElement, makeSpec } from '@design-validator/design-spec/testing';
import { describe, expect, it } from 'vitest';

import { matchElements } from '../src';

const page = (spec: ReturnType<typeof makeSpec>): DesignPage => {
  const result = spec.pages[0];
  if (!result) throw new Error('no page');
  return result;
};

const frame = (provider: 'figma' | 'website') =>
  makeElement(provider === 'figma' ? 'frame' : 'body', {
    type: provider === 'figma' ? 'frame' : 'container',
    bounds: { x: 0, y: 0, width: 1440, height: 900 },
  });

const pairs = (result: ReturnType<typeof matchElements>) =>
  Object.fromEntries(result.matches.map((m) => [m.designId, m.implementationId]));

describe('matchElements', () => {
  it('matches the same text despite different names and tags', () => {
    const design = makeSpec('figma', [
      frame('figma'),
      makeElement('title', {
        parentId: 'frame',
        name: 'Hero title',
        type: 'text',
        role: 'heading',
        text: 'Simple pricing',
        bounds: { x: 80, y: 64, width: 354, height: 56 },
      }),
    ]);
    const site = makeSpec('website', [
      frame('website'),
      makeElement('dom-1', {
        parentId: 'body',
        name: 'h2.xyz',
        type: 'text',
        role: 'heading',
        text: 'Simple   Pricing!',
        bounds: { x: 80, y: 60, width: 330, height: 52 },
      }),
    ]);
    const result = matchElements(page(design), page(site));
    expect(pairs(result)).toMatchObject({ frame: 'body', title: 'dom-1' });
    expect(result.matches.find((m) => m.designId === 'title')).toMatchObject({ ambiguous: false });
    expect(result.matches.find((m) => m.designId === 'title')?.methods).toEqual(
      expect.arrayContaining(['text', 'semantic-role']),
    );
  });

  it('matches semantic equivalents (Figma button → <a role=link>) and nested wrappers', () => {
    const design = makeSpec('figma', [
      frame('figma'),
      makeElement('btn', {
        parentId: 'frame',
        type: 'button',
        role: 'button',
        bounds: { x: 80, y: 180, width: 141, height: 48 },
      }),
      makeElement('label', {
        parentId: 'btn',
        type: 'text',
        role: 'paragraph',
        text: 'Get started',
        bounds: { x: 104, y: 192, width: 93, height: 24 },
      }),
    ]);
    const site = makeSpec('website', [
      frame('website'),
      makeElement('wrap1', { parentId: 'body', bounds: { x: 80, y: 180, width: 133, height: 48 } }),
      makeElement('wrap2', {
        parentId: 'wrap1',
        bounds: { x: 80, y: 180, width: 133, height: 48 },
      }),
      makeElement('link', {
        parentId: 'wrap2',
        type: 'link',
        role: 'link',
        text: 'Get started',
        bounds: { x: 80, y: 180, width: 133, height: 48 },
      }),
    ]);
    const result = matchElements(page(design), page(site));
    // The button lands on the element that renders the label, not on a wrapper,
    // and the label layer shares it because the link owns that text.
    expect(pairs(result)).toMatchObject({ btn: 'link', label: 'link' });
    expect(result.unmatchedDesignIds).toEqual([]);
  });

  it('distinguishes repeated cards by their content', () => {
    const card = (id: string, x: number, title: string, provider: 'figma' | 'website') => [
      makeElement(id, {
        parentId: provider === 'figma' ? 'frame' : 'body',
        role: 'card',
        type: 'container',
        bounds: { x, y: 300, width: 400, height: 200 },
      }),
      makeElement(`${id}-t`, {
        parentId: id,
        type: 'text',
        role: 'heading',
        text: title,
        bounds: { x: x + 24, y: 324, width: 200, height: 32 },
      }),
    ];
    const design = makeSpec('figma', [
      frame('figma'),
      ...card('c1', 80, 'Starter', 'figma'),
      ...card('c2', 504, 'Team', 'figma'),
      ...card('c3', 928, 'Enterprise', 'figma'),
    ]);
    // Website renders the cards in a different order.
    const site = makeSpec('website', [
      frame('website'),
      ...card('w1', 80, 'Team', 'website'),
      ...card('w2', 500, 'Starter', 'website'),
      ...card('w3', 920, 'Enterprise', 'website'),
    ]);
    const result = matchElements(page(design), page(site));
    expect(pairs(result)).toMatchObject({ 'c1-t': 'w2-t', 'c2-t': 'w1-t', 'c3-t': 'w3-t' });
    expect(pairs(result)).toMatchObject({ c1: 'w2', c2: 'w1', c3: 'w3' });
  });

  it('reports missing design elements and extra meaningful implementation elements', () => {
    const design = makeSpec('figma', [
      frame('figma'),
      makeElement('badge', {
        parentId: 'frame',
        type: 'text',
        role: 'label',
        text: 'Most popular',
        bounds: { x: 1200, y: 40, width: 100, height: 20 },
      }),
    ]);
    const site = makeSpec('website', [
      frame('website'),
      makeElement('wrapper', {
        parentId: 'body',
        bounds: { x: 0, y: 0, width: 1440, height: 400 },
      }),
      makeElement('promo', {
        parentId: 'wrapper',
        type: 'text',
        role: 'paragraph',
        text: 'Free shipping today',
        bounds: { x: 80, y: 600, width: 300, height: 20 },
      }),
    ]);
    const result = matchElements(page(design), page(site));
    expect(result.unmatchedDesignIds).toEqual(['badge']);
    expect(result.unmatchedImplementationIds).toEqual(['promo']); // the plain wrapper is not noise
  });

  it('flags ambiguous candidates instead of pretending certainty', () => {
    const design = makeSpec('figma', [
      frame('figma'),
      makeElement('icon', {
        parentId: 'frame',
        type: 'image',
        role: 'image',
        bounds: { x: 100, y: 100, width: 24, height: 24 },
      }),
    ]);
    const site = makeSpec('website', [
      frame('website'),
      makeElement('a', {
        parentId: 'body',
        type: 'image',
        role: 'image',
        bounds: { x: 90, y: 100, width: 24, height: 24 },
      }),
      makeElement('b', {
        parentId: 'body',
        type: 'image',
        role: 'image',
        bounds: { x: 110, y: 100, width: 24, height: 24 },
      }),
    ]);
    const match = matchElements(page(design), page(site)).matches.find(
      (m) => m.designId === 'icon',
    );
    expect(match?.ambiguous).toBe(true);
    expect(match?.alternatives).toHaveLength(1);
  });

  it('honours explicit mappings and data-dv-id attributes', () => {
    const design = makeSpec('figma', [
      frame('figma'),
      makeElement('hero', {
        parentId: 'frame',
        name: 'Hero',
        bounds: { x: 0, y: 0, width: 1440, height: 300 },
      }),
      makeElement('logo', {
        parentId: 'frame',
        name: 'Logo',
        type: 'image',
        role: 'image',
        bounds: { x: 20, y: 20, width: 40, height: 40 },
      }),
    ]);
    const site = makeSpec('website', [
      frame('website'),
      makeElement('far-away', {
        parentId: 'body',
        bounds: { x: 0, y: 2000, width: 1440, height: 300 },
        source: { provider: 'website', selector: '#hero' },
      }),
      makeElement('tagged', {
        parentId: 'body',
        type: 'image',
        role: 'image',
        bounds: { x: 900, y: 900, width: 40, height: 40 },
        source: { provider: 'website', attributes: { 'data-dv-id': 'Logo' } },
      }),
    ]);
    const result = matchElements(page(design), page(site), {
      explicitMappings: [{ designId: 'hero', implementationSelector: '#hero' }],
    });
    expect(result.matches.find((m) => m.designId === 'hero')).toMatchObject({
      implementationId: 'far-away',
      methods: ['explicit'],
      confidence: 1,
    });
    expect(result.matches.find((m) => m.designId === 'logo')).toMatchObject({
      implementationId: 'tagged',
      methods: ['source-id'],
    });
  });

  it('is deterministic', () => {
    const design = makeSpec('figma', [
      frame('figma'),
      makeElement('x', { parentId: 'frame', text: 'Hello', type: 'text' }),
    ]);
    const site = makeSpec('website', [
      frame('website'),
      makeElement('y', { parentId: 'body', text: 'Hello', type: 'text' }),
    ]);
    expect(matchElements(page(design), page(site))).toEqual(
      matchElements(page(design), page(site)),
    );
  });
});
