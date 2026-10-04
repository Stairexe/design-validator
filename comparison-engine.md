# Comparison Engine

## 1. Goal

The comparison engine turns two normalized `DesignSpec` documents into a deterministic list of actionable differences.

```ts
compare(design, implementation, options): ValidationReport
```

## 2. Output contract

```ts
export interface ValidationIssue {
  id: string;
  viewportId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  element: IssueElementReference;
  property: string;
  current: NormalizedValue;
  required: NormalizedValue;
  delta?: NormalizedValue;
  tolerance: number;
  status: 'difference' | 'within-tolerance' | 'unresolved';
  evidence: IssueEvidence;
  recommendation?: Recommendation;
}
```

## 3. Difference-first philosophy

The UI should show:

```text
Current → Required
```

rather than:

```text
Current = wrong
```

For numeric values:

```text
Current: 20px
Required: 24px
Change: +4px
```

For booleans:

```text
Current: visible
Required: hidden
```

For colors:

```text
Current: #121212
Required: #111111
```

For fonts:

```text
Current: Inter
Required: Geist
```

## 4. Categories

```ts
export type IssueCategory =
  | 'position'
  | 'size'
  | 'spacing'
  | 'typography'
  | 'color'
  | 'border'
  | 'radius'
  | 'effect'
  | 'layout'
  | 'responsive'
  | 'structure';
```

## 5. Tolerances

Default initial values should be conservative and configurable.

Suggested starting values:

```ts
const defaults = {
  positionPx: 2,
  sizePx: 2,
  spacingPx: 2,
  typographyPx: 1,
  colorDelta: 0,
  radiusPx: 1,
};
```

These are engineering defaults, not product truths. Fixtures should drive refinement.

## 6. Matching

### Step 1: explicit mapping

Use explicit user mappings or reliable source IDs when available.

### Step 2: semantic role

Examples:

```text
Figma button → <button>
Figma heading → <h1>/<h2>/<h3> or matching semantic role
Figma image → img/figure/image-like element
```

### Step 3: text similarity

Normalize whitespace and compare text where textual content exists.

### Step 4: hierarchy

Parent and sibling relationships strongly influence matching.

### Step 5: geometry

Use approximate bounds to disambiguate remaining candidates.

### Step 6: visual properties

Use color, dimensions, typography and shape as secondary evidence.

## 7. Matching confidence

Confidence is an internal control used to decide whether an issue can safely be shown as a direct comparison.

Example:

```text
0.95 — reliable
0.80 — usable but inspectable
0.60 — ambiguous
<0.60 — do not present as an exact match
```

Do not convert this to a page score.

## 8. Property comparison rules

### Position

Compare:

- x,
- y,
- alignment relative to parent when available.

### Size

Compare:

- width,
- height,
- min/max bounds when known.

### Spacing

Compare:

- margin,
- padding per side,
- gap,
- row-gap,
- column-gap.

Example issue:

```json
{
  "property": "padding.left",
  "current": 20,
  "required": 24,
  "delta": 4
}
```

### Typography

Compare:

- family,
- size,
- weight,
- line height,
- letter spacing,
- alignment,
- transformation,
- color.

### Color

Compare normalized RGBA values.

### Border/radius

Compare:

- border width,
- border style,
- border color,
- each corner radius.

### Effects

Compare:

- opacity,
- box shadow where representable,
- transform where normalized.

### Layout

Compare only properties that are semantically comparable between sources.

Example:

Figma auto layout should not be treated as a literal CSS `display:flex` requirement unless the implementation evidence supports that mapping.

Instead, compare the resulting behavior and measurable spacing/alignment first.

## 9. Structure issues

Structure differences occur when:

- a design element has no reliable implementation match,
- an implementation element has no design counterpart,
- hierarchy is materially different,
- a repeated component count differs.

Examples:

```text
Design: 3 card instances
Website: 4 cards

Required change: remove 1 extra card from the implementation.
```

## 10. Responsive comparison

Run each viewport independently.

For each matched element compare:

- existence,
- visibility,
- bounds,
- spacing,
- typography,
- layout behavior.

Do not average differences across viewports.

## 11. Issue deduplication

Avoid producing noise when one root cause creates many pixel-level differences.

Example:

```text
Parent padding: 20 → 24
```

may move ten children.

The engine should be able to retain child geometry differences but identify a likely parent-level grouping so the report can say:

```text
Likely root change: increase container horizontal padding 20px → 24px.
```

This grouping can be deterministic or AI-assisted, but the measured child deltas remain separate evidence.

## 12. Recommendation model

```ts
export interface Recommendation {
  source: 'deterministic' | 'ai';
  text?: string;
  code?: string;
  confidence?: number;
}
```

AI recommendations must not modify the issue values.

## 13. Validation report

```ts
export interface ValidationReport {
  auditId: string;
  generatedAt: string;
  viewports: ViewportReport[];
  issues: ValidationIssue[];
  counts: Record<IssueCategory, number>;
  unresolved: UnresolvedComparison[];
}
```

The report may contain counts, but no page-quality score is required.

## 14. Example final issue

```json
{
  "id": "issue_001",
  "viewportId": "desktop-1440",
  "category": "spacing",
  "severity": "high",
  "element": {
    "designId": "figma-node-123",
    "implementationId": "dom-98",
    "name": "Primary CTA"
  },
  "property": "paddingInline",
  "current": "20px",
  "required": "24px",
  "delta": "+4px",
  "tolerance": 2,
  "status": "difference"
}
```

## 15. Implementation notes

Implemented in `packages/matcher` and `packages/comparator`; contracts live in `packages/design-spec` (`report.ts`, `matching.ts`).

- **Values.** `current`, `required` and `delta` are `NormalizedValue`/`IssueDelta` objects (`{ kind: 'length', value: 20 }`), not strings. `delta = required − current`, the change to apply. Display strings (`20px`, `+4px`) come from `formatValue`/`formatDelta`.
- **Property paths** follow the DesignSpec structure (`padding.left`, `typography.fontSize`, `color.background`). Equal per-side differences are merged into `padding.inline` / `padding.block` / `padding` (likewise margin, border width and radius), matching how CSS is written.
- **Position** is compared relative to the matched parent on each side, so one container change is not repeated on every descendant. Text boxes skip width/height (font metrics) but keep position and typography.
- **Unknown values are never compared.** A Figma frame without auto layout has unknown padding (`undefined`), not 0; `line-height: normal` is never compared numerically.
- **Backgrounds** are compared as the colour the viewer sees (own fill composited over ancestors), so "no fill on a white page" equals "white fill".
- **Gap.** When the implementation spaces children with margins rather than `gap`, the gap is measured from child positions.
- **Matching** pre-matches the root frame to `body`, applies explicit mappings and `data-dv-id`, then scores pairs by role, text (Dice on bigrams), hierarchy, geometry and visual similarity over several passes. Ambiguous or low-confidence matches never produce differences; they appear under `unresolved`.
- **Structure.** Unmatched design elements become `structure.presence` issues (top-most only); a design element present but hidden at this viewport becomes a `visibility` issue in the `responsive` category; repeated-count mismatches become `structure.count` on the parent.
- **Grouping** (§11) is deterministic: padding, gap, sibling growth and container growth rules link child deltas to a likely root change only when the measured deltas add up.
- The regression fixture `fixtures/expected-reports/pricing.json` locks the end-to-end output of the pricing fixtures.
