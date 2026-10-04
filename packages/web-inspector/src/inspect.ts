import type { DesignSpec, DesignViewport } from '@design-validator/design-spec';
import type { Browser, BrowserContext, Page } from 'playwright-core';

import type { BrowserProvider } from './browser';
import { extractDom } from './dom';
import { InspectorError } from './errors';
import { toWebsiteDesignSpec } from './normalize';
import { CAPTURED_STYLE_PROPERTIES } from './raw-types';
import {
  DEFAULT_STABILITY,
  waitForStablePage,
  type StabilityOptions,
  type StabilityReport,
} from './stability';
import { createRequestGuard, validateTargetUrl, type UrlPolicy } from './url-validation';

export interface InspectionOptions extends UrlPolicy {
  navigationTimeoutMs?: number;
  stability?: Partial<StabilityOptions>;
  maxElements?: number;
  /** Full-page screenshots are clipped to this height (px) to bound memory. */
  maxScreenshotHeight?: number;
}

export interface ViewportInspection {
  viewport: DesignViewport;
  spec: DesignSpec;
  /** PNG bytes. */
  screenshot: Uint8Array;
  stability: StabilityReport;
  finalUrl: string;
  httpStatus: number | null;
  warnings: string[];
  elementCount: number;
}

export interface InspectWebsiteInput {
  url: string;
  viewports: DesignViewport[];
  browserProvider: BrowserProvider;
  options?: InspectionOptions;
}

const DEFAULTS = {
  navigationTimeoutMs: 30_000,
  maxElements: 4_000,
  maxScreenshotHeight: 12_000,
};

async function navigate(page: Page, url: string, timeoutMs: number): Promise<number | null> {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    const status = response?.status() ?? null;
    if (status === 401 || status === 403) {
      throw new InspectorError(
        'AUTH_REQUIRED',
        `The page requires authentication (HTTP ${status}).`,
      );
    }
    if (status !== null && status >= 400) {
      throw new InspectorError('PAGE_RENDER_FAILED', `The page responded with HTTP ${status}.`);
    }
    return status;
  } catch (error) {
    if (error instanceof InspectorError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (/timeout/i.test(message)) {
      throw new InspectorError('NAVIGATION_TIMEOUT', `Navigation timed out after ${timeoutMs}ms.`, {
        retryable: true,
        cause: error,
      });
    }
    throw new InspectorError(
      'PAGE_RENDER_FAILED',
      `Navigation failed: ${message.split('\n')[0] ?? ''}`,
      {
        retryable: true,
        cause: error,
      },
    );
  }
}

async function createIsolatedContext(
  browser: Browser,
  viewport: DesignViewport,
  policy: UrlPolicy,
): Promise<BrowserContext> {
  // Fresh context per inspection: no cookies, storage or credentials are shared.
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.devicePixelRatio ?? 1,
    serviceWorkers: 'block',
    acceptDownloads: false,
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
  });
  // Bundlers that preserve function names (esbuild keepNames) emit `__name`
  // helpers inside serialized functions; define it so `extractDom` runs as-is.
  await context.addInitScript('globalThis.__name = globalThis.__name || ((fn) => fn);');
  const guard = createRequestGuard(policy);
  await context.route('**/*', async (route) => {
    if (await guard(route.request().url())) {
      await route.continue();
    } else {
      await route.abort('blockedbyclient');
    }
  });
  return context;
}

async function inspectViewport(
  browser: Browser,
  url: string,
  viewport: DesignViewport,
  options: InspectionOptions,
): Promise<ViewportInspection> {
  const context = await createIsolatedContext(browser, viewport, options);
  try {
    const page = await context.newPage();
    const httpStatus = await navigate(
      page,
      url,
      options.navigationTimeoutMs ?? DEFAULTS.navigationTimeoutMs,
    );
    const stability = await waitForStablePage(page, { ...DEFAULT_STABILITY, ...options.stability });

    const extraction = await page.evaluate(extractDom, {
      maxElements: options.maxElements ?? DEFAULTS.maxElements,
      properties: CAPTURED_STYLE_PROPERTIES,
    });

    const warnings: string[] = [];
    if (extraction.truncated)
      warnings.push(
        `Element limit reached; only the first ${extraction.elements.length} elements were captured.`,
      );
    if (!stability.networkIdle)
      warnings.push('Network did not become idle; late-loading content may be missing.');
    if (!stability.layoutSettled)
      warnings.push('Layout was still changing when measurements were taken.');
    if (!stability.fontsReady) warnings.push('Web fonts were not confirmed loaded.');

    const spec = toWebsiteDesignSpec({
      url,
      viewport,
      extraction,
      metadata: { finalUrl: page.url(), httpStatus, stability },
    });
    const elements = spec.pages[0]?.elements ?? [];
    if (!elements.some((element) => element.visibility.visible && element.bounds.width > 0)) {
      throw new InspectorError('NO_VISIBLE_ELEMENTS', 'The page rendered no visible elements.');
    }

    const height = Math.min(
      extraction.document.height,
      options.maxScreenshotHeight ?? DEFAULTS.maxScreenshotHeight,
    );
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
      clip: { x: 0, y: 0, width: viewport.width, height: Math.max(1, height) },
    });

    return {
      viewport,
      spec,
      screenshot: new Uint8Array(screenshot),
      stability,
      finalUrl: page.url(),
      httpStatus,
      warnings,
      elementCount: elements.length,
    };
  } finally {
    await context.close();
  }
}

/**
 * Inspects `url` at each viewport and returns one Website DesignSpec and
 * screenshot per viewport. Viewports run sequentially to bound memory.
 */
export async function inspectWebsite({
  url,
  viewports,
  browserProvider,
  options = {},
}: InspectWebsiteInput): Promise<ViewportInspection[]> {
  const target = await validateTargetUrl(url, options);
  const browser = await browserProvider.launch();
  try {
    const results: ViewportInspection[] = [];
    for (const viewport of viewports) {
      results.push(await inspectViewport(browser, target.toString(), viewport, options));
    }
    return results;
  } finally {
    await browser.close();
  }
}
