import type { BrowserProvider } from './browser';

/**
 * Renders trusted, self-contained HTML (e.g. a design rendering) to a PNG.
 * All network access is blocked; only `data:` URLs load.
 */
export async function renderHtmlToPng(
  browserProvider: BrowserProvider,
  html: string,
  viewport: { width: number; height: number },
): Promise<Uint8Array> {
  const browser = await browserProvider.launch();
  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      javaScriptEnabled: false,
    });
    await context.route('**/*', (route) =>
      route.request().url().startsWith('data:') ? route.continue() : route.abort('blockedbyclient'),
    );
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const screenshot = await page.screenshot({ type: 'png', fullPage: true });
    await context.close();
    return new Uint8Array(screenshot);
  } finally {
    await browser.close();
  }
}
