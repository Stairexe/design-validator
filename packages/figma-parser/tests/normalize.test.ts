import { readFileSync } from 'node:fs';
import path from 'node:path';

import { validateDesignSpec, type DesignElement } from '@design-validator/design-spec';
import { describe, expect, it } from 'vitest';

import { FIGMA_PRICING_TARGETS, figmaToDesignSpec, type FigmaNodesResponse } from '../src';

const fixture = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../../../fixtures/figma/pricing.nodes.json'),
    'utf8',
  ),
) as FigmaNodesResponse;

const spec = figmaToDesignSpec({
  fileKey: 'FIXTURE',
  response: fixture,
  targets: FIGMA_PRICING_TARGETS,
});
const desktop = spec.pages[0]?.elements ?? [];
const byId = (id: string, elements: DesignElement[] = desktop) => elements.find((e) => e.id === id);

describe('figmaToDesignSpec', () => {
  it('produces a valid DesignSpec with one page per target frame', () => {
    expect(validateDesignSpec(spec).success).toBe(true);
    expect(spec.source).toMatchObject({ type: 'figma', id: 'FIXTURE', name: 'Pricing (fixture)' });
    expect(spec.pages.map((p) => [p.id, p.viewportId])).toEqual([
      ['1:2', 'desktop'],
      ['5:2', 'mobile'],
    ]);
    expect(spec.viewports.map((v) => v.id)).toEqual(['desktop', 'mobile']);
  });

  it('makes coordinates relative to the target frame', () => {
    expect(byId('1:2')?.bounds).toMatchObject({ x: 0, y: 0, width: 1440 });
    expect(byId('2:2')?.bounds).toMatchObject({ x: 80, y: 64 });
    expect(byId('6:2', spec.pages[1]?.elements)?.bounds).toMatchObject({ x: 20, y: 32 });
  });

  it('normalizes text nodes', () => {
    expect(byId('2:2')).toMatchObject({
      type: 'text',
      role: 'heading',
      text: 'Simple pricing',
      typography: {
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 700,
        lineHeight: 56,
        letterSpacing: -0.5,
        color: { hex: '#111111', alpha: 1 },
      },
      colors: { text: { hex: '#111111', alpha: 1 } },
    });
    expect(byId('2:3')?.role).toBe('paragraph');
  });

  it('maps auto layout to spacing and alignment', () => {
    expect(byId('2:1')).toMatchObject({
      layout: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
      spacing: { padding: { top: 64, right: 80, bottom: 64, left: 80 }, gap: 16, rowGap: 16 },
    });
    expect(byId('3:0')?.spacing).toMatchObject({ gap: 24, columnGap: 24 });
  });

  it('recognizes component instances as buttons with radius and fill', () => {
    expect(byId('2:4')).toMatchObject({
      type: 'button',
      role: 'button',
      spacing: { padding: { top: 12, right: 24, bottom: 12, left: 24 } },
      radius: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 },
      colors: { background: { hex: '#111111', alpha: 1 } },
      source: { provider: 'figma', originalType: 'INSTANCE', attributes: { component: 'Button' } },
    });
  });

  it('captures strokes, shadows and card roles', () => {
    expect(byId('3:1')).toMatchObject({
      role: 'card',
      border: {
        width: { top: 1, right: 1, bottom: 1, left: 1 },
        style: 'solid',
        color: { hex: '#e4e4e7', alpha: 1 },
      },
      effects: {
        shadows: [
          { x: 0, y: 4, blur: 12, spread: 0, inset: false, color: { hex: '#000000', alpha: 0.1 } },
        ],
        opacity: 1,
      },
    });
  });

  it('keeps padding unknown when a frame has no auto layout', () => {
    expect(byId('1:2')?.spacing).toEqual({});
  });

  it('wires hierarchy and keeps references as pointers', () => {
    expect(byId('2:1')?.childIds).toEqual(['2:2', '2:3', '2:4']);
    expect(byId('2:4')?.parentId).toBe('2:1');
    expect(byId('2:4')?.source.rawReference).toBe('figma://file/FIXTURE/node/2:4');
    expect(byId('2:4')?.source.sourcePath).toBe('Pricing / Desktop/Hero/Button / Primary');
  });
});

it('matches the committed normalized fixture (run scripts/capture-figma-fixture.ts after changes)', () => {
  const committed: unknown = JSON.parse(
    readFileSync(
      path.resolve(import.meta.dirname, '../../../fixtures/figma/pricing.spec.json'),
      'utf8',
    ),
  );
  expect(committed).toEqual(spec);
});

describe('figma edge cases', () => {
  const frame = (children: unknown[], extra: Record<string, unknown> = {}) =>
    ({
      name: 'f',
      nodes: {
        '1:1': {
          document: {
            id: '1:1',
            name: 'Frame',
            type: 'FRAME',
            absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 400 },
            children,
            ...extra,
          },
        },
      },
    }) as unknown as FigmaNodesResponse;

  it('marks hidden layers and their descendants as hidden-in-design', () => {
    const result = figmaToDesignSpec({
      fileKey: 'K',
      response: frame([
        {
          id: '1:2',
          name: 'Hidden',
          type: 'FRAME',
          visible: false,
          absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
          children: [
            {
              id: '1:3',
              name: 'Child',
              type: 'RECTANGLE',
              absoluteBoundingBox: { x: 0, y: 0, width: 5, height: 5 },
            },
          ],
        },
      ]),
      targets: [{ nodeId: '1:1' }],
    });
    const elements = result.pages[0]?.elements ?? [];
    expect(elements.find((e) => e.id === '1:3')?.visibility).toEqual({
      visible: false,
      reason: 'hidden-in-design',
    });
    expect(result.viewports[0]).toMatchObject({ width: 400, height: 400 });
  });

  it('collapses vector-only groups into icons and treats image fills as images', () => {
    const result = figmaToDesignSpec({
      fileKey: 'K',
      response: frame([
        {
          id: '2:1',
          name: 'Arrow',
          type: 'GROUP',
          absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
          children: [
            {
              id: '2:2',
              name: 'Vector',
              type: 'VECTOR',
              absoluteBoundingBox: { x: 0, y: 0, width: 20, height: 20 },
            },
          ],
        },
        {
          id: '3:1',
          name: 'Photo',
          type: 'RECTANGLE',
          fills: [{ type: 'IMAGE', imageRef: 'abc' }],
          absoluteBoundingBox: { x: 0, y: 40, width: 200, height: 100 },
        },
        {
          id: '4:1',
          name: 'Line height auto',
          type: 'TEXT',
          characters: 'Hi',
          style: { fontSize: 14, lineHeightUnit: 'INTRINSIC_%', lineHeightPx: 16.94 },
          absoluteBoundingBox: { x: 0, y: 200, width: 20, height: 17 },
        },
      ]),
      targets: [{ nodeId: '1:1' }],
    });
    const elements = result.pages[0]?.elements ?? [];
    expect(elements.find((e) => e.id === '2:1')?.type).toBe('icon');
    expect(elements.some((e) => e.id === '2:2')).toBe(false);
    expect(elements.find((e) => e.id === '3:1')).toMatchObject({ type: 'image', role: 'image' });
    expect(elements.find((e) => e.id === '4:1')?.typography?.lineHeight).toBe('normal');
  });

  it('fails clearly for missing targets', () => {
    expect(() =>
      figmaToDesignSpec({ fileKey: 'K', response: frame([]), targets: [{ nodeId: '9:9' }] }),
    ).toThrow(/9:9/);
  });
});
