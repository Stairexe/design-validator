import { chromium, type Browser } from 'playwright-core';

/** Supplies a Chromium instance; inspections create isolated contexts from it. */
export interface BrowserProvider {
  launch(): Promise<Browser>;
}

const LAUNCH_ARGS = [
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--mute-audio',
  '--no-first-run',
];

/**
 * Local/CI Chromium from the Playwright browser registry
 * (`PLAYWRIGHT_BROWSERS_PATH`), or an explicit `CHROMIUM_EXECUTABLE_PATH`.
 */
export function localBrowserProvider(
  executablePath = process.env['CHROMIUM_EXECUTABLE_PATH'],
): BrowserProvider {
  return {
    launch: () =>
      chromium.launch({
        headless: true,
        args: LAUNCH_ARGS,
        ...(executablePath ? { executablePath } : {}),
      }),
  };
}

/**
 * Serverless Chromium (`@sparticuz/chromium`) for Vercel/AWS Lambda, where the
 * Playwright registry is unavailable. Its Chromium major matches the pinned
 * `playwright-core` version.
 */
export function serverlessBrowserProvider(): BrowserProvider {
  return {
    launch: async () => {
      const { default: serverlessChromium } = await import('@sparticuz/chromium');
      return chromium.launch({
        headless: true,
        args: [...serverlessChromium.args, ...LAUNCH_ARGS],
        executablePath: await serverlessChromium.executablePath(),
      });
    },
  };
}

export function isServerlessRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env['VERCEL'] ?? env['AWS_LAMBDA_FUNCTION_NAME']);
}

export function defaultBrowserProvider(): BrowserProvider {
  return isServerlessRuntime() ? serverlessBrowserProvider() : localBrowserProvider();
}
