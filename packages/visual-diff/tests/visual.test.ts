import { makeElement, makeSpec } from '@design-validator/design-spec/testing';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

import { diffImages, pngSize, renderDesignHtml } from '../src';

function solid(
  width: number,
  height: number,
  rgb: [number, number, number],
  paint?: { x: number; y: number; w: number; h: number; rgb: [number, number, number] },
) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inPaint =
        paint && x >= paint.x && x < paint.x + paint.w && y >= paint.y && y < paint.y + paint.h;
      const [r, g, b] = inPaint ? paint.rgb : rgb;
      const i = (y * width + x) * 4;
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
  }
  return new Uint8Array(PNG.sync.write(png));
}

describe('diffImages', () => {
  it('reports zero difference for identical images', () => {
    const image = solid(20, 10, [255, 255, 255]);
    expect(diffImages(image, image)).toMatchObject({
      width: 20,
      height: 10,
      mismatchedPixels: 0,
      mismatchRatio: 0,
    });
  });

  it('counts differing pixels over the common area', () => {
    const website = solid(20, 12, [255, 255, 255], { x: 0, y: 0, w: 5, h: 2, rgb: [0, 0, 0] });
    const design = solid(20, 10, [255, 255, 255]);
    const result = diffImages(website, design);
    expect(result).toMatchObject({
      width: 20,
      height: 10,
      mismatchedPixels: 10,
      mismatchRatio: 0.05,
    });
    expect(pngSize(result.diff)).toEqual({ width: 20, height: 10 });
  });
});

describe('renderDesignHtml', () => {
  it('renders visible elements with geometry, colours and escaped text', () => {
    const spec = makeSpec('figma', [
      makeElement('frame', { type: 'frame', bounds: { x: 0, y: 0, width: 400, height: 300 } }),
      makeElement('cta', {
        parentId: 'frame',
        type: 'button',
        bounds: { x: 10, y: 20, width: 120, height: 40 },
        colors: { background: { hex: '#111111', alpha: 1 } },
        radius: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 },
      }),
      makeElement('label', {
        parentId: 'cta',
        type: 'text',
        text: '<Buy> & go',
        typography: {
          fontFamily: 'Arial',
          fontSize: 16,
          lineHeight: 24,
          color: { hex: '#ffffff', alpha: 1 },
        },
      }),
      makeElement('hidden', {
        parentId: 'frame',
        visibility: { visible: false, reason: 'hidden-in-design' },
      }),
    ]);
    const page = spec.pages[0];
    if (!page) throw new Error('no page');
    const html = renderDesignHtml({ ...page, height: 300 }, { width: 400 });
    expect(html).toContain('left:10px;top:20px;width:120px;height:40px');
    expect(html).toContain('background:#111111');
    expect(html).toContain('&lt;Buy&gt; &amp; go');
    expect(html).toContain('font-family:&quot;Arial&quot;, sans-serif');
    expect(html).not.toContain('data-id="hidden"');
  });
});
