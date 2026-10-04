import { validateDesignSpec, type DesignElement } from '@design-validator/design-spec';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  InspectorError,
  inspectWebsite,
  localBrowserProvider,
  type ViewportInspection,
} from '../src';
import { startFixtureServer } from './fixture-server';

const desktop = { id: 'desktop', width: 1440, height: 900 };
const mobile = { id: 'mobile', width: 390, height: 844 };

const find = (
  inspection: ViewportInspection | undefined,
  predicate: (e: DesignElement) => boolean,
) => inspection?.spec.pages[0]?.elements.find(predicate);

describe('inspectWebsite (Chromium integration)', { timeout: 90_000 }, () => {
  let server: Awaited<ReturnType<typeof startFixtureServer>>;
  let results: ViewportInspection[];

  beforeAll(async () => {
    server = await startFixtureServer();
    results = await inspectWebsite({
      url: `${server.url}/pricing.html`,
      viewports: [desktop, mobile],
      browserProvider: localBrowserProvider(),
      options: { allowPrivateHosts: true },
    });
  }, 90_000);

  afterAll(async () => {
    await server.close();
  });

  it('produces a valid Website DesignSpec and PNG screenshot per viewport', () => {
    expect(results.map((r) => r.viewport.id)).toEqual(['desktop', 'mobile']);
    for (const result of results) {
      expect(validateDesignSpec(result.spec)).toEqual({ success: true, spec: result.spec });
      expect(Array.from(result.screenshot.slice(1, 4))).toEqual([0x50, 0x4e, 0x47]); // "PNG"
      expect(result.elementCount).toBeGreaterThan(10);
    }
  });

  it('serves document overrides without touching the network', async () => {
    const url = `${server.url}/not-on-the-server.html`;
    const [result] = await inspectWebsite({
      url,
      viewports: [desktop],
      browserProvider: localBrowserProvider(),
      options: {
        allowPrivateHosts: true,
        documentOverrides: {
          [url]: { body: '<!doctype html><h1 style="margin:40px">Served locally</h1>' },
        },
      },
    });
    expect(result?.httpStatus).toBe(200);
    expect(
      result?.spec.pages[0]?.elements.some((element) => element.text === 'Served locally'),
    ).toBe(true);
  });

  it('captures resolved spacing, radius and colours (CSS variables resolved)', () => {
    const cta = find(results[0], (e) => e.source.classNames?.includes('primary-cta') ?? false);
    expect(cta).toMatchObject({
      type: 'button',
      role: 'button',
      text: 'Get started',
      spacing: { padding: { top: 12, right: 20, bottom: 12, left: 20 } },
      radius: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 },
      colors: { background: { hex: '#111111', alpha: 1 } },
    });
    expect(cta?.typography).toMatchObject({
      fontSize: 16,
      fontWeight: 600,
      lineHeight: 24,
      color: { hex: '#ffffff', alpha: 1 },
    });
    expect(cta?.source.selector).toBeTruthy();
  });

  it('captures typography, inheritance and the runtime style update', () => {
    const heading = find(results[0], (e) => e.source.attributes?.['id'] === 'hero-title');
    expect(heading).toMatchObject({ type: 'text', role: 'heading', text: 'Simple pricing' });
    expect(heading?.typography).toMatchObject({
      fontFamily: 'Arial',
      fontSize: 44,
      lineHeight: 52,
      fontWeight: 700,
      letterSpacing: -0.5,
    });
  });

  it('captures flex and grid layout with gaps', () => {
    const hero = find(results[0], (e) => e.source.classNames?.includes('hero') ?? false);
    expect(hero?.layout).toMatchObject({ display: 'flex', flexDirection: 'column' });
    expect(hero?.spacing.gap).toBe(16);
    const grid = find(results[0], (e) => e.source.classNames?.includes('cards') ?? false);
    expect(grid?.layout.display).toBe('grid');
    expect(grid?.spacing.gap).toBe(20);
    const cards =
      results[0]?.spec.pages[0]?.elements.filter((e) => e.source.classNames?.includes('card')) ??
      [];
    expect(cards).toHaveLength(3);
    expect(cards[0]?.effects.shadows).toEqual([
      { x: 0, y: 4, blur: 12, spread: 0, inset: false, color: { hex: '#000000', alpha: 0.1 } },
    ]);
    expect(cards[0]?.border).toMatchObject({
      width: { top: 1, right: 1, bottom: 1, left: 1 },
      style: 'solid',
    });
  });

  it('applies media queries per viewport and records visibility', () => {
    const desktopHeading = find(results[0], (e) => e.source.attributes?.['id'] === 'hero-title');
    const mobileHeading = find(results[1], (e) => e.source.attributes?.['id'] === 'hero-title');
    expect(desktopHeading?.typography?.fontSize).toBe(44);
    expect(mobileHeading?.typography?.fontSize).toBe(32);
    expect(find(results[0], (e) => e.text === 'Swipe to compare')?.visibility).toEqual({
      visible: false,
      reason: 'display-none',
    });
    expect(find(results[1], (e) => e.text === 'Swipe to compare')?.visibility).toEqual({
      visible: true,
    });
  });

  it('loads lazy content and records stabilization assumptions', () => {
    const lazy = find(results[0], (e) => e.source.classNames?.includes('lazy') ?? false);
    expect(lazy).toMatchObject({ type: 'image', bounds: { width: 200, height: 100 } });
    expect(results[0]?.stability).toMatchObject({
      fontsReady: true,
      imagesLoaded: true,
      layoutSettled: true,
      scrolledForLazyContent: true,
    });
  });

  it('is stable across repeated runs', async () => {
    const [again] = await inspectWebsite({
      url: `${server.url}/pricing.html`,
      viewports: [desktop],
      browserProvider: localBrowserProvider(),
      options: { allowPrivateHosts: true },
    });
    const strip = (r: ViewportInspection | undefined) => r?.spec.pages[0]?.elements;
    expect(strip(again)).toEqual(strip(results[0]));
  });

  it('fails with typed errors', async () => {
    await expect(
      inspectWebsite({
        url: `${server.url}/pricing.html`,
        viewports: [desktop],
        browserProvider: localBrowserProvider(),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_URL' });
    await expect(
      inspectWebsite({
        url: `${server.url}/missing.html`,
        viewports: [desktop],
        browserProvider: localBrowserProvider(),
        options: { allowPrivateHosts: true },
      }),
    ).rejects.toBeInstanceOf(InspectorError);
  });
});

describe('renderHtmlToPng', { timeout: 60_000 }, () => {
  it('renders self-contained HTML to a PNG of the page size', async () => {
    const { renderHtmlToPng } = await import('../src');
    const png = await renderHtmlToPng(
      localBrowserProvider(),
      '<html><body style="margin:0"><div style="width:300px;height:500px;background:#111"></div></body></html>',
      { width: 300, height: 200 },
    );
    const view = new DataView(png.buffer, png.byteOffset);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([300, 500]);
  });
});

describe('originHeaders', { timeout: 60_000 }, () => {
  it('sends extra headers only to the listed origin', async () => {
    const { createServer } = await import('node:http');
    const seen: (string | undefined)[] = [];
    const server = createServer((request, response) => {
      seen.push(request.headers['x-bypass'] as string | undefined);
      response
        .writeHead(200, { 'content-type': 'text/html' })
        .end('<html><body><p>Hello</p></body></html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no address');
    const origin = `http://127.0.0.1:${address.port}`;
    try {
      await inspectWebsite({
        url: `${origin}/`,
        viewports: [desktop],
        browserProvider: localBrowserProvider(),
        options: { allowPrivateHosts: true, originHeaders: { [origin]: { 'x-bypass': 's3cret' } } },
      });
      await inspectWebsite({
        url: `${origin}/`,
        viewports: [desktop],
        browserProvider: localBrowserProvider(),
        options: {
          allowPrivateHosts: true,
          originHeaders: { 'https://other.example': { 'x-bypass': 's3cret' } },
        },
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
    expect(seen[0]).toBe('s3cret');
    expect(seen.at(-1)).toBeUndefined();
  });
});
