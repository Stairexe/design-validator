import { formatDelta, formatValue, type ValidationIssue } from '@design-validator/design-spec';
import { makeElement } from '@design-validator/design-spec/testing';
import { describe, expect, it } from 'vitest';

import { buildReport } from '../src';
import { comparePair } from './helpers';

const box = (top: number, right: number, bottom: number, left: number) => ({
  top,
  right,
  bottom,
  left,
});
const summary = (issue: ValidationIssue | undefined) =>
  issue && {
    property: issue.property,
    current: formatValue(issue.current),
    required: formatValue(issue.required),
    change: issue.delta ? formatDelta(issue.delta) : undefined,
  };

describe('spacing', () => {
  it('20 vs 24 → difference +4px (merged into padding X)', () => {
    const { issues } = comparePair(
      [{ spacing: { padding: box(12, 24, 12, 24) } }],
      [{ spacing: { padding: box(12, 20, 12, 20) } }],
    );
    expect(issues.map(summary)).toEqual([
      { property: 'padding.inline', current: '20px', required: '24px', change: '+4px' },
    ]);
    expect(issues[0]).toMatchObject({
      category: 'spacing',
      status: 'difference',
      tolerance: 2,
      recommendation: { source: 'deterministic', code: '.el-0 {\n  padding-inline: 24px;\n}' },
    });
  });

  it('20 vs 21 with tolerance 2 → no issue', () => {
    expect(
      comparePair(
        [{ spacing: { padding: box(20, 20, 20, 20) } }],
        [{ spacing: { padding: box(21, 21, 21, 21) } }],
      ).issues,
    ).toEqual([]);
  });

  it('respects configured tolerances', () => {
    const { issues } = comparePair(
      [{ spacing: { padding: box(20, 20, 20, 20) } }],
      [{ spacing: { padding: box(21, 21, 21, 21) } }],
      { tolerances: { spacingPx: 0 } },
    );
    expect(issues.map(summary)).toEqual([
      { property: 'padding', current: '21px', required: '20px', change: '-1px' },
    ]);
  });

  it('never compares unknown design values', () => {
    expect(
      comparePair([{ spacing: {} }], [{ spacing: { padding: box(12, 20, 12, 20) } }]).issues,
    ).toEqual([]);
    expect(
      comparePair(
        [{ spacing: { padding: box(null as unknown as number, 24, 12, 24) } }],
        [{ spacing: { padding: box(30, 24, 12, 24) } }],
      ).issues,
    ).toEqual([]);
  });

  it('measures gap from child positions when the implementation uses margins', () => {
    const child = (id: string, parentId: string, y: number) =>
      makeElement(id, { parentId, bounds: { x: 0, y, width: 100, height: 40 } });
    const { issues } = comparePair(
      [{ spacing: { gap: 24 }, layout: { flexDirection: 'column' } }],
      [{ spacing: {} }],
      { websiteOnly: [child('a', 'w0', 0), child('b', 'w0', 60), child('c', 'w0', 120)] },
    );
    const gap = issues.find((issue) => issue.property === 'gap');
    expect(summary(gap)).toEqual({
      property: 'gap',
      current: '20px',
      required: '24px',
      change: '+4px',
    });
    expect(gap?.evidence.notes?.[0]).toMatch(/measured between children/);
  });
});

describe('typography', () => {
  it('44 vs 48 → +4px and 700 vs 600 → weight difference', () => {
    const { issues } = comparePair(
      [{ type: 'text', text: 'Hi', typography: { fontSize: 48, fontWeight: 600 } }],
      [{ type: 'text', text: 'Hi', typography: { fontSize: 44, fontWeight: 700 } }],
    );
    expect(issues.map(summary)).toEqual(
      expect.arrayContaining([
        { property: 'typography.fontSize', current: '44px', required: '48px', change: '+4px' },
        { property: 'typography.fontWeight', current: '700', required: '600', change: '-100' },
      ]),
    );
  });

  it('compares families case-insensitively and never treats normal line height as a number', () => {
    const { issues } = comparePair(
      [{ type: 'text', typography: { fontFamily: 'Geist', lineHeight: 24 } }],
      [{ type: 'text', typography: { fontFamily: 'Inter', lineHeight: 'normal' } }],
    );
    expect(issues.map(summary)).toEqual([
      { property: 'typography.fontFamily', current: 'Inter', required: 'Geist', change: undefined },
    ]);
    expect(
      comparePair(
        [{ type: 'text', typography: { fontFamily: 'inter' } }],
        [{ type: 'text', typography: { fontFamily: 'Inter, sans-serif' } }],
      ).issues,
    ).toEqual([]);
  });
});

describe('color', () => {
  it('#fff vs rgba(255,255,255,1) → equal', () => {
    const white = { hex: '#ffffff', alpha: 1 };
    expect(
      comparePair([{ colors: { background: white } }], [{ colors: { background: { ...white } } }])
        .issues,
    ).toEqual([]);
  });

  it('reports text colour differences with ΔE', () => {
    const { issues } = comparePair(
      [{ type: 'text', typography: { color: { hex: '#000000', alpha: 1 } } }],
      [{ type: 'text', typography: { color: { hex: '#121212', alpha: 1 } } }],
    );
    expect(summary(issues[0])).toMatchObject({
      property: 'color.text',
      current: '#121212',
      required: '#000000',
    });
    expect(issues[0]?.delta?.kind).toBe('color-distance');
  });

  it('compares the background the viewer sees (no fill on white ≡ white fill)', () => {
    expect(
      comparePair([{ colors: { background: { hex: '#ffffff', alpha: 1 } } }], [{ colors: {} }])
        .issues,
    ).toEqual([]);
    const { issues } = comparePair(
      [{ colors: { background: { hex: '#111111', alpha: 1 } } }],
      [{ colors: {} }],
    );
    expect(summary(issues[0])).toEqual({
      property: 'color.background',
      current: 'none',
      required: '#111111',
      change: issues[0]?.delta ? formatDelta(issues[0].delta) : undefined,
    });
  });
});

describe('geometry', () => {
  it('width 200 vs 204 → +4px', () => {
    const { issues } = comparePair(
      [{ bounds: { x: 0, y: 0, width: 204, height: 40 } }],
      [{ bounds: { x: 0, y: 0, width: 200, height: 40 } }],
    );
    expect(issues.map(summary)).toEqual([
      { property: 'bounds.width', current: '200px', required: '204px', change: '+4px' },
    ]);
  });

  it('measures position relative to the matched parent', () => {
    const { issues } = comparePair(
      [{ bounds: { x: 84, y: 0, width: 100, height: 40 } }],
      [{ bounds: { x: 80, y: 0, width: 100, height: 40 } }],
    );
    expect(issues.map(summary)).toEqual([
      { property: 'bounds.x', current: '80px', required: '84px', change: '+4px' },
    ]);
  });
});

describe('border and radius', () => {
  it('merges equal corners and clamps pill radii', () => {
    const r = (v: number) => ({ topLeft: v, topRight: v, bottomRight: v, bottomLeft: v });
    expect(comparePair([{ radius: r(12) }], [{ radius: r(8) }]).issues.map(summary)).toEqual([
      { property: 'radius', current: '8px', required: '12px', change: '+4px' },
    ]);
    expect(
      comparePair(
        [{ radius: r(9999), bounds: { x: 0, y: 0, width: 100, height: 40 } }],
        [{ radius: r(20), bounds: { x: 0, y: 0, width: 100, height: 40 } }],
      ).issues,
    ).toEqual([]);
  });

  it('compares border width, style and colour', () => {
    const { issues } = comparePair(
      [{ border: { width: box(2, 2, 2, 2), style: 'solid', color: { hex: '#e4e4e7', alpha: 1 } } }],
      [
        {
          border: { width: box(1, 1, 1, 1), style: 'dashed', color: { hex: '#e4e4e7', alpha: 1 } },
        },
      ],
    );
    expect(issues.map((i) => i.property).sort()).toEqual(['border.style', 'border.width']);
  });
});

describe('effects and layout', () => {
  it('compares shadows and opacity', () => {
    const shadow = {
      x: 0,
      y: 4,
      blur: 12,
      spread: 0,
      inset: false,
      color: { hex: '#000000', alpha: 0.1 },
    };
    const { issues } = comparePair(
      [{ effects: { shadows: [shadow], opacity: 1 } }],
      [{ effects: { shadows: [], opacity: 0.5 } }],
    );
    expect(issues.map((i) => i.property).sort()).toEqual(['effects.opacity', 'effects.shadows']);
  });

  it('only compares layout behaviour both sides express', () => {
    const { issues } = comparePair(
      [{ layout: { flexDirection: 'row' }, childIds: [] }],
      [{ layout: { display: 'flex', flexDirection: 'column' } }],
    );
    expect(issues.map(summary)).toEqual([
      { property: 'layout.flexDirection', current: 'column', required: 'row', change: undefined },
    ]);
    expect(
      comparePair([{ layout: { flexDirection: 'row' } }], [{ layout: { display: 'block' } }])
        .issues,
    ).toEqual([]);
  });
});

describe('structure', () => {
  it('3 design cards vs 4 website cards → extra implementation element', () => {
    const siteCard = (x: number) => ({
      parentId: 'w0',
      name: 'article.card',
      bounds: { x, y: 0, width: 100, height: 100 },
      source: { provider: 'website' as const, originalType: 'article', classNames: ['card'] },
    });
    const designCard = (x: number) => ({
      parentId: 'd0',
      name: 'Card',
      bounds: { x, y: 0, width: 100, height: 100 },
    });
    const extraCard = makeElement('k4', { ...siteCard(360), text: 'Legacy' });
    const { issues } = comparePair(
      [
        { name: 'Cards', bounds: { x: 0, y: 0, width: 500, height: 100 } },
        designCard(0),
        designCard(120),
        designCard(240),
      ],
      [
        { name: 'section.cards', bounds: { x: 0, y: 0, width: 500, height: 100 } },
        siteCard(0),
        siteCard(120),
        siteCard(240),
      ],
      { websiteOnly: [extraCard] },
    );
    const count = issues.find((issue) => issue.property === 'structure.count');
    expect(summary(count)).toEqual({
      property: 'structure.count',
      current: '4',
      required: '3',
      change: '-1',
    });
    expect(count?.recommendation?.text).toBe('Remove 1 repeated item.');
    expect(
      issues.find((issue) => issue.property === 'structure.presence')?.element.implementationId,
    ).toBe('k4');
  });

  it('reports missing design elements once per subtree and extra meaningful elements', () => {
    const missing = makeElement('m', {
      parentId: 'frame',
      type: 'button',
      role: 'button',
      name: 'Secondary CTA',
    });
    const missingChild = makeElement('m-label', {
      parentId: 'm',
      type: 'text',
      text: 'Learn more',
    });
    const extra = makeElement('x', {
      parentId: 'body',
      type: 'text',
      text: 'Cookie banner',
      source: { provider: 'website', selector: '#cookies' },
    });
    const result = comparePair([], [], {
      designOnly: [missing, missingChild],
      websiteOnly: [extra],
    });
    expect(
      result.issues.map((i) => [
        i.element.name,
        i.property,
        formatValue(i.current),
        formatValue(i.required),
      ]),
    ).toEqual([
      ['Secondary CTA', 'structure.presence', 'none', 'present'],
      ['x', 'structure.presence', 'present', 'none'],
    ]);
    expect(result.unresolved.map((u) => [u.side, u.elementId, u.reason])).toEqual([
      ['design', 'm', 'no-match'],
      ['design', 'm-label', 'no-match'],
      ['implementation', 'x', 'no-match'],
    ]);
  });

  it('reports elements hidden at this viewport as visibility differences', () => {
    const designHint = makeElement('hint', {
      parentId: 'frame',
      type: 'text',
      text: 'Swipe to compare',
    });
    const siteHint = makeElement('h', {
      parentId: 'body',
      type: 'text',
      text: 'Swipe to compare',
      visibility: { visible: false, reason: 'display-none' },
    });
    const { issues } = comparePair([], [], { designOnly: [designHint], websiteOnly: [siteHint] });
    expect(issues.find((i) => i.property === 'visibility')).toMatchObject({
      category: 'responsive',
      current: { value: 'hidden (display-none)' },
      required: { value: 'visible' },
    });
  });
});

describe('report', () => {
  it('produces deterministic IDs and category counts, and no score', () => {
    const run = () =>
      comparePair(
        [{ spacing: { padding: box(12, 24, 12, 24) } }],
        [{ spacing: { padding: box(12, 20, 12, 20) } }],
      );
    expect(run().issues.map((i) => i.id)).toEqual(run().issues.map((i) => i.id));
    const report = buildReport('audit_1', [run()], '2026-01-01T00:00:00.000Z');
    expect(report.counts.spacing).toBe(1);
    expect(report.viewports[0]).toMatchObject({ viewportId: 'desktop', issueCount: 1 });
    expect(JSON.stringify(report)).not.toMatch(/score/i);
  });

  it('keeps ambiguous matches out of differences and lists them as unresolved', () => {
    const { issues, unresolved } = comparePair(
      [{ spacing: { padding: box(12, 24, 12, 24) } }],
      [{ spacing: { padding: box(12, 20, 12, 20) } }],
      {
        matches: [
          { ambiguous: true, alternatives: [{ implementationId: 'body', confidence: 0.7 }] },
        ],
      },
    );
    expect(issues).toEqual([]);
    expect(unresolved[0]).toMatchObject({ elementId: 'd0', reason: 'ambiguous' });
  });
});
