import { describe, expect, it } from 'vitest';

import { FigmaError, parseFigmaUrl } from '../src';

describe('parseFigmaUrl', () => {
  it.each([
    [
      'https://www.figma.com/design/AbC123/Pricing?node-id=1-2&t=x',
      { fileKey: 'AbC123', nodeId: '1:2' },
    ],
    ['https://www.figma.com/file/AbC123/Pricing', { fileKey: 'AbC123' }],
    [
      'https://figma.com/proto/AbC123/Pricing?node-id=10-20',
      { fileKey: 'AbC123', nodeId: '10:20' },
    ],
    [
      'https://www.figma.com/design/AbC123/branch/BrX9/Pricing?node-id=3-4',
      { fileKey: 'BrX9', nodeId: '3:4' },
    ],
  ])('%s', (url, expected) => {
    expect(parseFigmaUrl(url)).toEqual(expected);
  });

  it.each([
    'not a url',
    'https://example.com/design/abc',
    'https://www.figma.com/community/file/123',
  ])('rejects %s', (url) => {
    expect(() => parseFigmaUrl(url)).toThrow(FigmaError);
  });
});
