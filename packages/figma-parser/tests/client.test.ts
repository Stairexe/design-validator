import { describe, expect, it } from 'vitest';

import { FigmaClient } from '../src';

function fakeFetch(
  status: number,
  body: unknown,
  seen: { url?: string; headers?: Record<string, string> } = {},
) {
  return ((url: string, init?: RequestInit) => {
    seen.url = url;
    seen.headers = init?.headers as Record<string, string>;
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  }) as typeof fetch;
}

describe('FigmaClient', () => {
  it('sends personal tokens via X-Figma-Token and OAuth via Bearer', async () => {
    const seen: { url?: string; headers?: Record<string, string> } = {};
    const personal = new FigmaClient({
      accessToken: 'pat',
      fetch: fakeFetch(200, { name: 'f', nodes: { '1:2': { document: {} } } }, seen),
    });
    await personal.getNodes('KEY', ['1:2']);
    expect(seen.url).toBe('https://api.figma.com/v1/files/KEY/nodes?ids=1%3A2');
    expect(seen.headers).toEqual({ 'X-Figma-Token': 'pat' });

    const oauth = new FigmaClient({
      accessToken: 'tok',
      tokenType: 'oauth',
      fetch: fakeFetch(200, { name: 'f', nodes: { '1:2': { document: {} } } }, seen),
    });
    await oauth.getNodes('KEY', ['1:2']);
    expect(seen.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it.each([
    [403, 'FIGMA_AUTH_FAILED', false],
    [404, 'FIGMA_NODE_NOT_FOUND', false],
    [429, 'FIGMA_RATE_LIMITED', true],
    [502, 'FIGMA_REQUEST_FAILED', true],
  ])('maps HTTP %d to %s', async (status, code, retryable) => {
    const client = new FigmaClient({ accessToken: 'secret-token', fetch: fakeFetch(status, {}) });
    const error = await client.getNodes('KEY', ['1:2']).catch((e: unknown) => e);
    expect(error).toMatchObject({ code, retryable });
    expect((error as Error).message).not.toContain('secret-token');
  });

  it('reports nodes missing from a successful response', async () => {
    const client = new FigmaClient({
      accessToken: 'pat',
      fetch: fakeFetch(200, { name: 'f', nodes: { '1:2': null } }),
    });
    await expect(client.getNodes('KEY', ['1:2'])).rejects.toMatchObject({
      code: 'FIGMA_NODE_NOT_FOUND',
    });
  });

  it('lists pages and top-level frames', async () => {
    const file = {
      name: 'Site',
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [
          {
            id: '0:1',
            name: 'Page 1',
            type: 'CANVAS',
            children: [
              {
                id: '1:2',
                name: 'Desktop',
                type: 'FRAME',
                absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 900 },
              },
              { id: '1:3', name: 'Sticky note', type: 'STICKY' },
            ],
          },
        ],
      },
    };
    const client = new FigmaClient({ accessToken: 'pat', fetch: fakeFetch(200, file) });
    expect(await client.listFrames('KEY')).toEqual({
      name: 'Site',
      pages: [
        {
          id: '0:1',
          name: 'Page 1',
          frames: [{ id: '1:2', name: 'Desktop', type: 'FRAME', width: 1440, height: 900 }],
        },
      ],
    });
  });
});
