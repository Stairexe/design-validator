import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { ValidationIssue } from '@design-validator/design-spec';
import { describe, expect, it } from 'vitest';

import {
  fetchGitHubStylesheets,
  locateDeclarations,
  mediaApplies,
  parseStylesheet,
  rewriteShorthand,
  selectorScore,
} from '../src';

const pricingCss = readFileSync(
  path.resolve(import.meta.dirname, '../../../fixtures/source-repo/styles/pricing.css'),
  'utf8',
);

const issue = (property: string, required: number): ValidationIssue => ({
  id: 'iss_1',
  viewportId: 'desktop',
  category: 'spacing',
  severity: 'medium',
  element: { name: 'Button / Primary', implementationId: 'dom-4' },
  property,
  current: { kind: 'length', value: 20 },
  required: { kind: 'length', value: required },
  tolerance: 2,
  status: 'difference',
  evidence: {},
});

const button = { tag: 'button', classes: ['primary-cta'] };

describe('parseStylesheet', () => {
  it('extracts rules, declarations and line numbers, ignoring comments', () => {
    const rules = parseStylesheet(
      '/* a { color: red; } */\n.card {\n  padding: 24px; /* x */\n  color: #222;\n}\n',
    );
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ selectors: ['.card'], line: 2, endLine: 5 });
    expect(rules[0]?.declarations.map((d) => [d.property, d.value, d.line])).toEqual([
      ['padding', '24px', 3],
      ['color', '#222', 4],
    ]);
  });

  it('expands SCSS nesting and records media conditions', () => {
    const rules = parseStylesheet(
      '.hero {\n  h1 { font-size: 44px; }\n  &:hover { color: red; }\n}\n@media (max-width: 600px) {\n  .hero h1 { font-size: 32px; }\n}\n',
    );
    expect(rules.map((r) => [r.selectors.join(','), r.atRules.join(',')])).toEqual([
      ['.hero', ''],
      ['.hero h1', ''],
      ['.hero:hover', ''],
      ['.hero h1', '@media (max-width: 600px)'],
    ]);
  });
});

describe('selector matching', () => {
  it('scores the last compound selector against the element', () => {
    expect(selectorScore('.hero .primary-cta', button)).toBe(10);
    expect(selectorScore('button.primary-cta', button)).toBe(11);
    expect(selectorScore('.secondary-cta', button)).toBe(0);
    expect(selectorScore('a.primary-cta', button)).toBe(0);
    expect(selectorScore('.primary-cta:hover', button)).toBe(2.5);
  });

  it('applies media conditions by viewport width', () => {
    expect(mediaApplies(['@media (max-width: 600px)'], 390)).toBe(true);
    expect(mediaApplies(['@media (max-width: 600px)'], 1440)).toBe(false);
    expect(mediaApplies(['@media (min-width: 768px)'], 1440)).toBe(true);
  });
});

describe('rewriteShorthand', () => {
  it.each([
    ['padding', '12px 20px', 'padding-inline', '24px', '12px 24px'],
    ['padding', '12px 20px', 'padding-left', '24px', '12px 20px 12px 24px'],
    ['padding', '12px', 'padding-block', '16px', '16px 12px'],
    ['border-radius', '8px', 'border-top-left-radius', '12px', '12px 8px 8px'],
    ['gap', '20px', 'column-gap', '24px', '20px 24px'],
    ['margin', '0 auto', 'margin-top', '8px', null],
    ['padding', 'var(--space) 20px', 'padding-inline', '24px', null],
  ])('%s: %s with %s=%s → %s', (shorthand, value, target, required, expected) => {
    expect(rewriteShorthand(shorthand, value, target, required)).toBe(expected);
  });
});

describe('locateDeclarations', () => {
  const files = [{ path: 'styles/pricing.css', content: pricingCss }];

  it('finds the rule and patches the shorthand to the required value', () => {
    const [match] = locateDeclarations(files, button, issue('padding.inline', 24), {
      viewportWidth: 1440,
    });
    expect(match).toMatchObject({
      path: 'styles/pricing.css',
      selector: '.primary-cta',
      declaration: { property: 'padding', value: '12px 20px' },
    });
    expect(match?.patch).toContain('-  padding: 12px 20px;');
    expect(match?.patch).toContain('+  padding: 12px 24px;');
    expect(match?.patch).toMatch(
      /^--- a\/styles\/pricing\.css\n\+\+\+ b\/styles\/pricing\.css\n@@ -\d+,1 \+\d+,1 @@/,
    );
  });

  it('adds an override when the value uses a variable', () => {
    const [match] = locateDeclarations(
      files,
      button,
      { ...issue('radius', 12), category: 'radius' },
      { viewportWidth: 1440 },
    );
    expect(match?.declaration?.value).toBe('var(--radius)');
    expect(match?.patch).toContain('+  border-radius: 12px;');
    expect(match?.note).toMatch(/cannot be rewritten safely/);
  });

  it('prefers media rules that apply at the viewport', () => {
    const heading = { tag: 'h1', id: 'hero-title', classes: [] };
    const fontIssue = { ...issue('typography.fontSize', 40), category: 'typography' as const };
    expect(
      locateDeclarations(files, heading, fontIssue, { viewportWidth: 390 })[0]?.atRules,
    ).toEqual(['@media (max-width: 600px)']);
    expect(
      locateDeclarations(files, heading, fontIssue, { viewportWidth: 1440 })[0]?.atRules,
    ).toEqual([]);
  });

  it('returns nothing for properties without CSS or unmatched elements', () => {
    expect(
      locateDeclarations(files, button, issue('bounds.x', 4), { viewportWidth: 1440 }),
    ).toEqual([]);
    expect(
      locateDeclarations(files, { tag: 'video', classes: ['x'] }, issue('padding.inline', 24), {
        viewportWidth: 1440,
      }),
    ).toEqual([]);
  });
});

describe('fetchGitHubStylesheets', () => {
  it('lists stylesheets from the tree and skips vendored output', async () => {
    const requested: string[] = [];
    const fakeFetch = ((url: string) => {
      requested.push(url);
      if (url.includes('/git/trees/')) {
        return Promise.resolve(
          Response.json({
            tree: [
              { path: 'styles/pricing.css', type: 'blob', size: 100 },
              { path: 'node_modules/x/y.css', type: 'blob', size: 10 },
              { path: 'dist/app.min.css', type: 'blob', size: 10 },
              { path: 'src/app.tsx', type: 'blob', size: 10 },
            ],
          }),
        );
      }
      return Promise.resolve(new Response('.a { color: red; }'));
    }) as typeof fetch;
    const files = await fetchGitHubStylesheets(
      { owner: 'acme', repo: 'site', ref: 'main' },
      { fetch: fakeFetch },
    );
    expect(files).toEqual([
      {
        path: 'styles/pricing.css',
        content: '.a { color: red; }',
        url: 'https://github.com/acme/site/blob/main/styles/pricing.css',
      },
    ]);
    expect(requested).toHaveLength(2);
  });

  it('rejects unsafe repository names and reports missing repositories', async () => {
    await expect(
      fetchGitHubStylesheets({ owner: '../etc', repo: 'x', ref: 'main' }),
    ).rejects.toThrow(/Invalid/);
    const notFound = (() => Promise.resolve(new Response('', { status: 404 }))) as typeof fetch;
    await expect(
      fetchGitHubStylesheets({ owner: 'acme', repo: 'gone', ref: 'main' }, { fetch: notFound }),
    ).rejects.toThrow(/not found/);
  });
});
