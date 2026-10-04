/// <reference lib="dom" />

import type { Page } from 'playwright-core';

export interface StabilityOptions {
  networkIdleTimeoutMs: number;
  fontsTimeoutMs: number;
  imagesTimeoutMs: number;
  /** Layout must be unchanged for this long to count as settled. */
  quietPeriodMs: number;
  maxStabilizationMs: number;
  /** Scroll through the page so lazy-loaded content renders. */
  scrollForLazyContent: boolean;
}

export const DEFAULT_STABILITY: StabilityOptions = {
  networkIdleTimeoutMs: 5_000,
  fontsTimeoutMs: 5_000,
  imagesTimeoutMs: 5_000,
  quietPeriodMs: 500,
  maxStabilizationMs: 6_000,
  scrollForLazyContent: true,
};

/** What was observed while declaring the page stable (architecture.md §6). */
export interface StabilityReport {
  networkIdle: boolean;
  fontsReady: boolean;
  imagesLoaded: boolean;
  layoutSettled: boolean;
  scrolledForLazyContent: boolean;
  animationsDisabled: boolean;
  elapsedMs: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

const settle = async (promise: Promise<unknown>): Promise<boolean> => {
  try {
    await promise;
    return true;
  } catch {
    return false;
  }
};

/**
 * Bounded multi-signal stabilization: DOM ready (from navigation), network
 * idle, fonts, lazy content, images, and a layout quiet period. No single fixed
 * sleep; every signal is capped and the outcome of each is recorded.
 */
export async function waitForStablePage(
  page: Page,
  options: StabilityOptions = DEFAULT_STABILITY,
): Promise<StabilityReport> {
  const started = Date.now();

  // Animations/transitions make geometry non-deterministic; they are not compared.
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}',
  });

  const networkIdle = await settle(
    page.waitForLoadState('networkidle', { timeout: options.networkIdleTimeoutMs }),
  );
  const fontsReady = await settle(
    withTimeout(
      page.evaluate(async () => {
        await document.fonts.ready;
      }),
      options.fontsTimeoutMs,
    ),
  );

  let scrolled = false;
  if (options.scrollForLazyContent) {
    scrolled = await settle(
      page.evaluate(async () => {
        const step = Math.max(200, window.innerHeight);
        const limit = Math.min(document.documentElement.scrollHeight, 20_000);
        for (let y = 0; y < limit; y += step) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        window.scrollTo(0, 0);
      }),
    );
  }

  const imagesLoaded = await settle(
    page.waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      undefined,
      { timeout: options.imagesTimeoutMs },
    ),
  );

  const remaining = Math.max(
    options.quietPeriodMs,
    options.maxStabilizationMs - (Date.now() - started),
  );
  const layoutSettled = await settle(
    page.waitForFunction(
      ({ quietMs }) => {
        const w = window as unknown as { __dvLayout?: { signature: string; since: number } };
        const signature = `${document.documentElement.scrollHeight}|${document.body?.innerHTML.length ?? 0}|${document.querySelectorAll('*').length}`;
        const now = performance.now();
        if (w.__dvLayout?.signature !== signature) {
          w.__dvLayout = { signature, since: now };
          return false;
        }
        return now - w.__dvLayout.since >= quietMs;
      },
      { quietMs: options.quietPeriodMs },
      { timeout: remaining, polling: 100 },
    ),
  );

  return {
    networkIdle,
    fontsReady,
    imagesLoaded,
    layoutSettled,
    scrolledForLazyContent: scrolled,
    animationsDisabled: true,
    elapsedMs: Date.now() - started,
  };
}
