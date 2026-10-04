# Product Specification

## 1. Product promise

Design Validator tells developers and designers **exactly what to change** so a website matches a design file.

It is not primarily a scorecard.

## 2. Core workflow

```text
Create Project
    ↓
Enter Website URL
    ↓
Select viewport(s)
    ↓
Connect Figma OR upload XD manifest
    ↓
Select target frame/page
    ↓
Run validation
    ↓
See measured differences
    ↓
Inspect visual overlay
    ↓
Copy fix / inspect probable cause
```

## 3. New Audit screen

### Website source

Fields:

- URL,
- viewport presets,
- custom viewport,
- device pixel ratio if supported,
- optional authentication strategy for a future version.

### Design source

Tabs:

```text
Figma
Adobe XD
```

Figma:

- file URL,
- target page,
- target frame/node.

XD:

- upload JSON manifest,
- manifest version,
- target frame.

### Comparison settings

```text
Position tolerance
Size tolerance
Spacing tolerance
Typography tolerance
Color tolerance
Enable responsive checks
Enable visual diff
```

## 4. Processing screen

Show pipeline stages:

```text
Website
  ✓ Loading
  ✓ Rendering
  ✓ Extracting styles
  ✓ Extracting geometry
  ✓ Capturing screenshot

Design
  ✓ Loading
  ✓ Parsing hierarchy
  ✓ Extracting styles
  ✓ Normalizing

Comparison
  ✓ Matching elements
  ● Comparing properties
  ○ Generating recommendations
```

## 5. Results screen

### Primary layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Audit: Pricing Page                                          │
│ URL • viewport • design source                               │
├─────────────────────────────────────────────────────────────┤
│ Filters: All | Layout | Typography | Color | Spacing ...    │
├──────────────────────┬──────────────────────────────────────┤
│ Issue list            │ Selected issue                       │
│                      │                                      │
│ Button / CTA         │ Primary CTA                          │
│ Padding X 20 → 24    │ Padding X                            │
│                      │ Current   20px                       │
│ Hero heading         │ Required 24px                        │
│ Font 44 → 48         │ Change   +4px                        │
│                      │                                      │
│ Card gap 20 → 24     │ Recommended CSS                      │
│                      │ .button { padding-inline: 24px; }   │
└──────────────────────┴──────────────────────────────────────┘
```

### No primary score

Do not show `87/100`, `match score`, or similar as the primary result.

An internal count of issues may be shown:

```text
27 differences
```

This is a count, not a quality score.

## 6. Difference model in UI

Every issue should answer four questions:

1. Where?
2. What property?
3. What is it now?
4. What should it be changed to?

Example:

```text
Navbar / Logo

Height
Current: 32px
Required: 36px
Change: +4px
```

## 7. Severity

Use severity only to communicate practical impact, not to produce a score.

Suggested values:

- `critical` — structure is materially broken or intended component cannot be represented.
- `high` — clearly visible or interaction-affecting mismatch.
- `medium` — visible design difference.
- `low` — small difference within acceptable rendering noise.
- `info` — informational or non-actionable observation.

## 8. Visual validation

Modes:

- Side-by-side.
- Overlay with opacity slider.
- Difference image.
- Blink/alternating view.

Selecting an issue should highlight the corresponding region in both images when a reliable mapping exists.

## 9. CSS recommendation panel

Show recommendations only after measured differences are available.

Example:

```text
Measured difference
padding-inline: 20px → 24px

Likely implementation cause
The button appears to use 20px horizontal padding.

Suggested change
.button {
  padding-inline: 24px;
}

[Copy CSS]
```

Label AI-generated recommendations as recommendations. Never present AI-generated code as the measured truth.

## 10. Responsive report

Each viewport is an independent set of differences.

Example:

```text
Desktop 1440 × 900
8 differences

Mobile 390 × 844
19 differences
```

Do not average them into one score.

## 11. Project model

A project may contain:

- one canonical website URL,
- multiple design revisions,
- multiple audits,
- multiple viewport profiles.

Future capability:

```text
Design revision A → audit
Design revision B → audit
```

so a team can see exactly which differences appeared after a design change.

## 12. Accessibility of the validator UI

The validator itself must use:

- keyboard-accessible controls,
- visible focus states,
- semantic buttons and form controls,
- accessible labels,
- contrast that meets the application's chosen accessibility target.
