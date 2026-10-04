import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { DesignSpec } from '@design-validator/design-spec';
import { describe, expect, it } from 'vitest';

import { matchElements } from '../src';

const fixtures = path.resolve(import.meta.dirname, '../../../fixtures');
const read = (file: string): unknown => JSON.parse(readFileSync(path.join(fixtures, file), 'utf8'));

const figma = read('figma/pricing.spec.json') as DesignSpec;

describe('fixture pair: pricing.html vs pricing.nodes.json', () => {
  it.each([
    ['desktop', 0],
    ['mobile', 1],
  ] as const)('matches every design element at %s', (viewport, pageIndex) => {
    const site = read(`websites/pricing.${viewport}.spec.json`) as DesignSpec;
    const designPage = figma.pages[pageIndex];
    const sitePage = site.pages[0];
    if (!designPage || !sitePage) throw new Error('missing page');

    const result = matchElements(designPage, sitePage);
    const implName = (id: string) => sitePage.elements.find((e) => e.id === id)?.name;
    const pairs: Record<string, string | undefined> = Object.fromEntries(
      result.matches.map((m) => [
        designPage.elements.find((e) => e.id === m.designId)?.name ?? m.designId,
        implName(m.implementationId),
      ]),
    );

    expect(result.unmatchedDesignIds).toEqual([]);
    expect(pairs['Hero title']).toBe('h1#hero-title "Simple pricing"');
    expect(pairs['Button / Primary']).toBe('button.primary-cta "Get started"');
    expect(pairs['Label']).toBe('button.primary-cta "Get started"');
    expect(pairs['Hero']).toBe('section.hero');
    expect(result.matches.every((m) => !m.ambiguous)).toBe(true);
  });

  it('pairs repeated cards by content and reports the undesigned image as extra', () => {
    const site = read('websites/pricing.desktop.spec.json') as DesignSpec;
    const designPage = figma.pages[0];
    const sitePage = site.pages[0];
    if (!designPage || !sitePage) throw new Error('missing page');
    const result = matchElements(designPage, sitePage);
    const text = (id: string) => sitePage.elements.find((e) => e.id === id)?.text;
    for (const [designId, title] of [
      ['3:11', 'Starter'],
      ['3:21', 'Team'],
      ['3:31', 'Enterprise'],
    ] as const) {
      const match = result.matches.find((m) => m.designId === designId);
      expect(text(match?.implementationId ?? '')).toBe(title);
    }
    expect(
      result.unmatchedImplementationIds.map(
        (id) => sitePage.elements.find((e) => e.id === id)?.name,
      ),
    ).toEqual(['Decorative']);
  });
});
