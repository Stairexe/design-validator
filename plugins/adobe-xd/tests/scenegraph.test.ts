import { validateXdManifest, xdManifestToDesignSpec } from '@design-validator/xd-parser';
import { describe, expect, it } from 'vitest';

import { buildManifest } from '../src/scenegraph';
import type { XdSceneNode } from '../src/scene-types';

const color = (hex: string, a = 255) => ({ toHex: () => hex.toUpperCase(), a });
const list = (nodes: XdSceneNode[]) => ({
  length: nodes.length,
  forEach: (cb: (node: XdSceneNode) => void) => nodes.forEach(cb),
});
function node(type: string, guid: string, props: Partial<XdSceneNode> = {}): XdSceneNode {
  return {
    guid,
    name: guid,
    constructor: { name: type },
    visible: true,
    opacity: 1,
    globalBounds: { x: 0, y: 0, width: 10, height: 10 },
    ...props,
  };
}

describe('buildManifest', () => {
  const label = node('Text', 'label', {
    globalBounds: { x: 1124, y: 2192, width: 93, height: 24 },
    text: 'Get started',
    fontFamily: 'Arial',
    fontStyle: 'SemiBold',
    fontSize: 16,
    lineSpacing: 24,
    charSpacing: 0,
    textAlign: 'left',
    fill: color('#ffffff'),
  });
  const button = node('SymbolInstance', 'cta', {
    name: 'Button / Primary',
    globalBounds: { x: 1080, y: 2180, width: 141, height: 48 },
    fill: color('#111111'),
    fillEnabled: true,
    cornerRadii: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 },
    layout: {
      type: 'stack',
      stack: { orientation: 'horizontal', spacings: 8 },
      padding: { values: { top: 12, right: 24, bottom: 12, left: 24 } },
    },
    mainComponent: { name: 'Button' },
    shadow: { x: 0, y: 4, blur: 12, color: color('#000000', 26), visible: true },
    children: list([label]),
  });
  const artboard = node('Artboard', 'ab', {
    name: 'Desktop',
    globalBounds: { x: 1000, y: 2000, width: 1440, height: 900 },
    fill: color('#ffffff'),
    children: list([button]),
  });

  const manifest = buildManifest('Pricing.xd', [artboard], '2026-10-01T00:00:00.000Z');

  it('produces a manifest the server-side parser accepts', () => {
    expect(validateXdManifest(manifest)).toMatchObject({
      manifestVersion: '1.0',
      document: { name: 'Pricing.xd' },
    });
  });

  it('exports artboard-relative geometry, stacks, symbols and text', () => {
    const [cta] = manifest.artboards[0]?.children ?? [];
    expect(cta).toMatchObject({
      guid: 'cta',
      bounds: { x: 80, y: 180, width: 141, height: 48 },
      fill: { type: 'color', color: '#111111', alpha: 1 },
      layout: { type: 'stack', orientation: 'horizontal', spacing: 8, padding: { left: 24 } },
      symbolName: 'Button',
      shadow: { y: 4, blur: 12, alpha: 0.102 },
    });
    expect(cta?.children?.[0]).toMatchObject({
      type: 'Text',
      bounds: { x: 124, y: 192 },
      text: { content: 'Get started', fontStyle: 'SemiBold', color: '#ffffff' },
    });
  });

  it('normalizes into the same DesignSpec shape used for Figma', () => {
    const spec = xdManifestToDesignSpec(validateXdManifest(manifest), [{ artboardGuid: 'ab' }]);
    expect(spec.pages[0]?.elements.find((e) => e.id === 'cta')).toMatchObject({
      type: 'button',
      spacing: { padding: { top: 12, right: 24, bottom: 12, left: 24 } },
      radius: { topLeft: 12 },
    });
  });

  it('marks image fills by type only and skips disabled fills', () => {
    const image = node('Rectangle', 'img', { fill: { constructor: { name: 'ImageFill' } } });
    const disabled = node('Rectangle', 'off', { fill: color('#ff0000'), fillEnabled: false });
    const result = buildManifest('x', [
      node('Artboard', 'a', { children: list([image, disabled]) }),
    ]);
    expect(result.artboards[0]?.children.map((c) => c.fill)).toEqual([
      { type: 'image' },
      undefined,
    ]);
  });
});
