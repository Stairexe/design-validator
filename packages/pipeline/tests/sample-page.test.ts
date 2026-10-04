import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SAMPLE_PAGE_PATH, sampleDocumentOverrides } from '../src/sample';
import { SAMPLE_PAGE_HTML } from '../src/sample-page';

const root = path.resolve(import.meta.dirname, '../../..');

describe('bundled sample page', () => {
  it('is identical to the fixture and to the page the web app serves', async () => {
    const fixture = await readFile(path.join(root, 'fixtures/websites/pricing.html'), 'utf8');
    const served = await readFile(path.join(root, `apps/web/public${SAMPLE_PAGE_PATH}`), 'utf8');
    expect(SAMPLE_PAGE_HTML).toBe(fixture);
    expect(SAMPLE_PAGE_HTML).toBe(served);
  });
});

describe('sampleDocumentOverrides', () => {
  const self = ['https://app.example.com', 'https://preview-abc.vercel.app'];

  it('serves the bundled page for this deployment’s own sample URL', () => {
    const overrides = sampleDocumentOverrides(
      'https://preview-abc.vercel.app/samples/pricing.html',
      self,
    );
    expect(Object.keys(overrides ?? {})).toEqual([
      'https://preview-abc.vercel.app/samples/pricing.html',
    ]);
    expect(Object.values(overrides ?? {})[0]?.body).toBe(SAMPLE_PAGE_HTML);
  });

  it('never overrides other sites or other paths', () => {
    expect(sampleDocumentOverrides('https://other.com/samples/pricing.html', self)).toBeUndefined();
    expect(sampleDocumentOverrides('https://app.example.com/pricing', self)).toBeUndefined();
    expect(sampleDocumentOverrides('https://app.example.com/samples/pricing.html')).toBeUndefined();
    expect(sampleDocumentOverrides('not a url', self)).toBeUndefined();
  });
});
