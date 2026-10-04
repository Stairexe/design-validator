import type { FigmaNodesResponse } from '@design-validator/figma-parser';
import type { DocumentOverride } from '@design-validator/web-inspector';

import sampleNodes from '../../../fixtures/figma/pricing.nodes.json' with { type: 'json' };

import { SAMPLE_PAGE_HTML } from './sample-page';

/**
 * Built-in sample design: the repository's pricing fixture. Lets a new
 * deployment run a complete audit with no Figma credentials, against the
 * sample page the web app serves at `/samples/pricing.html`.
 */
export const SAMPLE_FIGMA_NODES = sampleNodes as unknown as FigmaNodesResponse;
export const SAMPLE_FILE_KEY = 'sample-pricing';
export const SAMPLE_PAGE_PATH = '/samples/pricing.html';
/**
 * The bundled sample page for `websiteUrl` when it points at this deployment's
 * own `/samples/pricing.html`; otherwise nothing, and the page is fetched as usual.
 */
export function sampleDocumentOverrides(
  websiteUrl: string,
  selfOrigins: readonly string[] = [],
): Record<string, DocumentOverride> | undefined {
  let url: URL;
  try {
    url = new URL(websiteUrl);
  } catch {
    return undefined;
  }
  if (url.pathname !== SAMPLE_PAGE_PATH || !selfOrigins.includes(url.origin)) return undefined;
  return { [url.toString()]: { body: SAMPLE_PAGE_HTML, contentType: 'text/html; charset=utf-8' } };
}

export const SAMPLE_VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900, label: 'Desktop', designNodeId: '1:2' },
  { id: 'mobile', width: 390, height: 844, label: 'Mobile', designNodeId: '5:2' },
];
