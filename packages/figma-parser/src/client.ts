import { FigmaError } from './errors';
import type { FigmaFileResponse, FigmaImagesResponse, FigmaNodesResponse } from './figma-types';

export interface FigmaClientOptions {
  accessToken: string;
  /** Personal access tokens use `X-Figma-Token`; OAuth tokens use `Authorization: Bearer`. */
  tokenType?: 'personal' | 'oauth';
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface FigmaFrameSummary {
  id: string;
  name: string;
  type: string;
  width: number | null;
  height: number | null;
}

export interface FigmaPageSummary {
  id: string;
  name: string;
  frames: FigmaFrameSummary[];
}

/** Thin, typed Figma REST client. The token never appears in errors or logs. */
export class FigmaClient {
  readonly #options: Required<Omit<FigmaClientOptions, 'fetch'>> & { fetch: typeof fetch };

  constructor(options: FigmaClientOptions) {
    if (!options.accessToken) {
      throw new FigmaError('FIGMA_AUTH_FAILED', 'A Figma access token is required.');
    }
    this.#options = {
      accessToken: options.accessToken,
      tokenType: options.tokenType ?? 'personal',
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
      baseUrl: options.baseUrl ?? 'https://api.figma.com',
      timeoutMs: options.timeoutMs ?? 30_000,
    };
  }

  async #get<T>(path: string): Promise<T> {
    const { accessToken, tokenType, baseUrl, timeoutMs } = this.#options;
    const headers: Record<string, string> =
      tokenType === 'oauth'
        ? { Authorization: `Bearer ${accessToken}` }
        : { 'X-Figma-Token': accessToken };
    let response: Response;
    try {
      response = await this.#options.fetch(`${baseUrl}${path}`, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new FigmaError('FIGMA_REQUEST_FAILED', 'Could not reach the Figma API.', {
        retryable: true,
        cause: error,
      });
    }
    if (response.status === 401 || response.status === 403) {
      throw new FigmaError(
        'FIGMA_AUTH_FAILED',
        'Figma rejected the access token or the file is not shared with it.',
      );
    }
    if (response.status === 404) {
      throw new FigmaError('FIGMA_NODE_NOT_FOUND', 'The Figma file or node was not found.');
    }
    if (response.status === 429) {
      throw new FigmaError('FIGMA_RATE_LIMITED', 'The Figma API rate limit was reached.', {
        retryable: true,
      });
    }
    if (!response.ok) {
      throw new FigmaError(
        'FIGMA_REQUEST_FAILED',
        `The Figma API responded with HTTP ${response.status}.`,
        {
          retryable: response.status >= 500,
        },
      );
    }
    return (await response.json()) as T;
  }

  /** Full subtree for each node ID. */
  async getNodes(fileKey: string, nodeIds: string[]): Promise<FigmaNodesResponse> {
    const ids = nodeIds.map(encodeURIComponent).join(',');
    const response = await this.#get<FigmaNodesResponse>(
      `/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${ids}`,
    );
    for (const id of nodeIds) {
      if (!response.nodes[id]) {
        throw new FigmaError('FIGMA_NODE_NOT_FOUND', `Figma node ${id} was not found in the file.`);
      }
    }
    return response;
  }

  /** Pages and their top-level frames, for target selection. */
  async listFrames(fileKey: string): Promise<{ name: string; pages: FigmaPageSummary[] }> {
    const file = await this.#get<FigmaFileResponse>(
      `/v1/files/${encodeURIComponent(fileKey)}?depth=2`,
    );
    return {
      name: file.name,
      pages: (file.document.children ?? []).map((page) => ({
        id: page.id,
        name: page.name,
        frames: (page.children ?? [])
          .filter((node) =>
            ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'SECTION', 'INSTANCE'].includes(node.type),
          )
          .map((node) => ({
            id: node.id,
            name: node.name,
            type: node.type,
            width: node.absoluteBoundingBox?.width ?? null,
            height: node.absoluteBoundingBox?.height ?? null,
          })),
      })),
    };
  }

  /** Rendered PNG URLs (short-lived, hosted by Figma) for visual comparison. */
  async getImageUrls(
    fileKey: string,
    nodeIds: string[],
    scale = 1,
  ): Promise<Record<string, string | null>> {
    const ids = nodeIds.map(encodeURIComponent).join(',');
    const response = await this.#get<FigmaImagesResponse>(
      `/v1/images/${encodeURIComponent(fileKey)}?ids=${ids}&format=png&scale=${scale}`,
    );
    if (response.err) {
      throw new FigmaError(
        'FIGMA_REQUEST_FAILED',
        `Figma could not render the node: ${response.err}`,
      );
    }
    return response.images;
  }
}
