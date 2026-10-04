import { FigmaError } from './errors';

export interface FigmaFileReference {
  fileKey: string;
  /** API node ID (`1:2`), when the URL targets a node. */
  nodeId?: string;
}

/**
 * Parses Figma file URLs:
 * `figma.com/design|file|proto/:key/...?node-id=1-2` and
 * `figma.com/design/:key/branch/:branchKey/...` (the branch key is the file key).
 */
export function parseFigmaUrl(input: string): FigmaFileReference {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new FigmaError('FIGMA_INVALID_URL', 'Not a valid Figma URL.');
  }
  if (!/(^|\.)figma\.com$/.test(url.hostname)) {
    throw new FigmaError('FIGMA_INVALID_URL', 'The URL is not a figma.com URL.');
  }
  const segments = url.pathname.split('/').filter(Boolean);
  const kind = segments[0];
  if (!kind || !['design', 'file', 'proto'].includes(kind) || !segments[1]) {
    throw new FigmaError('FIGMA_INVALID_URL', 'The URL does not point to a Figma design file.');
  }
  const fileKey = segments[2] === 'branch' && segments[3] ? segments[3] : segments[1];
  const nodeParam = url.searchParams.get('node-id');
  return nodeParam ? { fileKey, nodeId: nodeParam.replace(/-/g, ':') } : { fileKey };
}
