import type { FigmaNodesResponse } from '@design-validator/figma-parser';

import sampleNodes from '../../../fixtures/figma/pricing.nodes.json' with { type: 'json' };

/**
 * Built-in sample design: the repository's pricing fixture. Lets a new
 * deployment run a complete audit with no Figma credentials, against the
 * sample page the web app serves at `/samples/pricing.html`.
 */
export const SAMPLE_FIGMA_NODES = sampleNodes as unknown as FigmaNodesResponse;
export const SAMPLE_FILE_KEY = 'sample-pricing';
export const SAMPLE_PAGE_PATH = '/samples/pricing.html';
export const SAMPLE_VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900, label: 'Desktop', designNodeId: '1:2' },
  { id: 'mobile', width: 390, height: 844, label: 'Mobile', designNodeId: '5:2' },
];
