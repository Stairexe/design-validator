import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildReport, compareViewport } from '@design-validator/comparator';
import {
  formatDelta,
  formatValue,
  propertyLabel,
  type DesignSpec,
} from '@design-validator/design-spec';
import { matchElements } from '@design-validator/matcher';
import { describe, expect, it } from 'vitest';

/**
 * End-to-end regression: inspected fixture website vs normalized Figma fixture.
 * Update the expectation deliberately with `UPDATE_EXPECTED=1 pnpm test`.
 */
const fixtures = path.resolve(import.meta.dirname, '../../fixtures');
const read = (file: string): unknown => JSON.parse(readFileSync(path.join(fixtures, file), 'utf8'));
const expectedFile = path.join(fixtures, 'expected-reports/pricing.json');

const design = read('figma/pricing.spec.json') as DesignSpec;
const comparisons = (['desktop', 'mobile'] as const).map((viewportId, index) => {
  const site = read(`websites/pricing.${viewportId}.spec.json`) as DesignSpec;
  const designPage = design.pages[index];
  const sitePage = site.pages[0];
  const viewport = design.viewports[index];
  if (!designPage || !sitePage || !viewport) throw new Error('fixture pages missing');
  return compareViewport({
    viewport,
    design: designPage,
    implementation: sitePage,
    matches: matchElements(designPage, sitePage),
  });
});
const report = buildReport('audit_fixture', comparisons, '2026-01-01T00:00:00.000Z');

const compact = {
  counts: report.counts,
  issues: report.issues.map((issue) => ({
    viewport: issue.viewportId,
    element: issue.element.name,
    property: propertyLabel(issue.property),
    current: formatValue(issue.current),
    required: formatValue(issue.required),
    ...(issue.delta ? { change: formatDelta(issue.delta) } : {}),
    severity: issue.severity,
  })),
  rootCauses: report.groups
    .filter((group) => group.kind === 'likely-root-cause')
    .map((group) => `${group.viewportId}: ${group.label} (${group.issueIds.length - 1} explained)`),
};

describe('pricing fixture regression', () => {
  it('reports padding: 20px → 24px, not a score (Phase 5 acceptance)', () => {
    const padding = report.issues.find(
      (issue) =>
        issue.viewportId === 'desktop' &&
        issue.element.name === 'Button / Primary' &&
        issue.property === 'padding.inline',
    );
    expect(
      padding && [
        formatValue(padding.current),
        formatValue(padding.required),
        padding.delta && formatDelta(padding.delta),
      ],
    ).toEqual(['20px', '24px', '+4px']);
    expect(JSON.stringify(report)).not.toMatch(/score/i);
  });

  it('matches the expected report', () => {
    if (process.env['UPDATE_EXPECTED'] === '1' || !existsSync(expectedFile)) {
      writeFileSync(expectedFile, `${JSON.stringify(compact, null, 2)}\n`);
    }
    expect(compact).toEqual(JSON.parse(readFileSync(expectedFile, 'utf8')));
  });
});
