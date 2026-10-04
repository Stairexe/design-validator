/**
 * Regenerates fixtures/figma/pricing.spec.json (normalized DesignSpec) from
 * fixtures/figma/pricing.nodes.json. A figma-parser test fails when they drift.
 *
 *   pnpm --filter @design-validator/web-inspector exec tsx ../../scripts/capture-figma-fixture.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  FIGMA_PRICING_TARGETS,
  figmaToDesignSpec,
  type FigmaNodesResponse,
} from '../packages/figma-parser/src';

const dir = path.resolve(import.meta.dirname, '../fixtures/figma');
const response = JSON.parse(
  readFileSync(path.join(dir, 'pricing.nodes.json'), 'utf8'),
) as FigmaNodesResponse;
const spec = figmaToDesignSpec({ fileKey: 'FIXTURE', response, targets: FIGMA_PRICING_TARGETS });
writeFileSync(path.join(dir, 'pricing.spec.json'), `${JSON.stringify(spec, null, 1)}\n`);
console.log('written');
