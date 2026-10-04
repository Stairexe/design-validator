/**
 * Regenerates fixtures/websites/pricing.<viewport>.spec.json by inspecting
 * fixtures/websites/pricing.html in Chromium. Run after changing the fixture
 * page or the inspector's normalization:
 *
 *   pnpm --filter @design-validator/web-inspector exec tsx ../../scripts/capture-website-fixture.ts
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { inspectWebsite, localBrowserProvider } from '../packages/web-inspector/src';
import { startFixtureServer } from '../packages/web-inspector/tests/fixture-server';

const root = path.resolve(import.meta.dirname, '..');
const server = await startFixtureServer();
try {
  const results = await inspectWebsite({
    url: `${server.url}/pricing.html`,
    viewports: [
      { id: 'desktop', width: 1440, height: 900 },
      { id: 'mobile', width: 390, height: 844 },
    ],
    browserProvider: localBrowserProvider(),
    options: { allowPrivateHosts: true },
  });
  for (const result of results) {
    // Strip the ephemeral port so the fixture is stable.
    const json = JSON.stringify(result.spec, null, 1).replaceAll(
      server.url,
      'http://fixture.local',
    );
    writeFileSync(
      path.join(root, `fixtures/websites/pricing.${result.viewport.id}.spec.json`),
      `${json}\n`,
    );
  }
  console.log(`captured ${results.length} viewports`);
} finally {
  await server.close();
}
