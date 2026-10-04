# Development Phases

## Strategy

Build from the deterministic core outward.

The correct order is:

```text
Foundation
→ Website extraction
→ Figma extraction
→ Normalization
→ Matching
→ Comparison
→ Difference UI
→ Visual diff
→ Claude explanations
→ XD
→ Code/GitHub integration
```

Do not begin with AI features. The measured comparison must work before Claude is added.

---

# Phase 0 — Repository Foundation

## Goal

Create the monorepo, coding rules, CI, shared TypeScript configuration, database skeleton, and `DesignSpec` package.

## Build

- Next.js app.
- pnpm workspace.
- Turborepo or equivalent task runner.
- TypeScript strict mode.
- ESLint/Prettier.
- Vitest.
- Playwright test harness.
- Prisma/PostgreSQL skeleton.
- Redis/BullMQ skeleton.
- `.env.example`.
- `CLAUDE.md`.
- package boundaries.

## Acceptance criteria

- Clean install.
- `typecheck` passes.
- lint passes.
- test suite passes.
- app boots.
- worker process boots.
- database migration boots.

## Claude Cloud task

Ask Claude to complete only repository scaffolding and CI. Do not ask it to build the entire product.

---

# Phase 1 — DesignSpec Foundation

## Goal

Create the canonical source-independent schema.

## Build

- DesignSpec types.
- validation schema.
- normalization helpers.
- units.
- colors.
- typography.
- geometry.
- schema versioning.
- fixtures.

## Acceptance criteria

Given two source-independent objects, the schema can represent:

- text,
- buttons,
- containers,
- images,
- spacing,
- typography,
- color,
- borders,
- radius,
- geometry,
- viewport behavior.

---

# Phase 2 — Website Inspector

## Goal

Given a URL and viewport, produce a Website DesignSpec plus screenshot.

## Build

Playwright pipeline:

```text
URL
→ browser context
→ navigation
→ stabilization
→ DOM traversal
→ computed styles
→ geometry
→ screenshot
→ DesignSpec
```

Extract at minimum:

- tag,
- role,
- text,
- classes,
- computed width/height,
- x/y,
- display,
- position,
- margin,
- padding,
- gap,
- font family,
- font size,
- weight,
- line height,
- letter spacing,
- text color,
- background,
- border,
- radius,
- opacity.

## Security

Implement URL validation and browser isolation before accepting arbitrary public URLs.

## Acceptance criteria

For fixture websites, repeated runs produce stable normalized values within expected browser noise.

---

# Phase 3 — Figma Importer

## Goal

Take a Figma document or target node and normalize it into DesignSpec.

## Build

- authentication strategy,
- file retrieval,
- node traversal,
- relevant style extraction,
- component/instance handling,
- auto-layout handling,
- typography extraction,
- geometry extraction,
- normalization.

## Acceptance criteria

A representative Figma design can be converted to DesignSpec without source-specific assumptions leaking into `packages/comparator`.

---

# Phase 4 — Deterministic Matcher

## Goal

Match Figma/XD design elements to website elements.

## Order

```text
Explicit mapping
→ semantic role
→ text similarity
→ hierarchy
→ geometry
→ visual properties
```

## Acceptance criteria

Fixtures cover:

- exact matches,
- renamed classes,
- semantic HTML equivalents,
- repeated cards,
- nested wrappers,
- missing elements,
- extra elements,
- ambiguous elements.

---

# Phase 5 — Comparison Engine

## Goal

Generate exact differences.

## Build

Comparators for:

- position,
- width/height,
- margin,
- padding,
- gap,
- typography,
- colors,
- border,
- radius,
- effects,
- layout behavior,
- responsive changes,
- structure.

## Required output

```text
Property
Current
Required
Delta
Tolerance
Severity
Evidence
```

## Acceptance criteria

Fixture:

```text
Website padding = 20px
Design padding = 24px
```

must produce:

```text
padding: 20px → 24px
```

and not:

```text
score: 93
```

---

# Phase 6 — Results UX

## Goal

Expose differences in a developer-friendly interface.

## Build

- issue list,
- category filters,
- element grouping,
- issue detail panel,
- current vs required values,
- copyable CSS area,
- viewport filters,
- unresolved mappings.

## Acceptance criteria

A user can locate an issue and understand exactly what to change without opening a raw JSON file.

---

# Phase 7 — Visual Comparison

## Goal

Add visual evidence to numeric issues.

## Build

- side-by-side screenshots,
- overlay slider,
- difference view,
- issue-region highlighting.

## Acceptance criteria

Clicking a measured issue highlights the corresponding area when mapping confidence is sufficient.

---

# Phase 8 — Claude Recommendation Layer

## Goal

Use Claude only after deterministic differences exist.

## Build

Anthropic client abstraction.

Input:

```json
{
  "element": "Primary CTA",
  "category": "spacing",
  "issues": [
    {"property":"paddingInline","current":"20px","required":"24px","delta":"+4px"}
  ],
  "sourceContext": {
    "selector": ".primary-cta"
  }
}
```

Output:

```json
{
  "explanation": "The implementation appears to use smaller horizontal padding.",
  "recommendedCode": ".primary-cta { padding-inline: 24px; }",
  "caveats": []
}
```

## Acceptance criteria

Claude cannot modify or contradict the measured difference object.

---

# Phase 9 — Adobe XD

## Goal

Add Adobe XD as a first-class source through a plugin-generated manifest.

## Build

- XD UXP plugin.
- scenegraph traversal.
- manifest schema.
- export action.
- upload/import flow.
- normalization.

## Acceptance criteria

An XD artboard can be exported to a manifest and compared against a website using the same comparator package used for Figma.

---

# Phase 10 — Source-Code Mapping

## Goal

Connect an issue to the actual implementation source.

Possible future sources:

- uploaded repository,
- GitHub repository,
- connected Git branch.

## Build

- map DOM node → selector/file/line where practical,
- code viewer,
- diff editor,
- suggested patch.

---

# Phase 11 — Revalidation Loop

## Goal

Automatically verify a proposed change.

Flow:

```text
Issue
→ suggested fix
→ code change
→ build
→ launch preview
→ rerun inspector
→ compare again
```

## Acceptance criteria

The system can demonstrate that a specific issue was removed after a code change.

---

# Phase 12 — Product Hardening

## Build

- quotas,
- billing,
- rate limiting,
- audit retention,
- project permissions,
- error monitoring,
- performance tuning,
- production deployment,
- data deletion tools.

Do not start this phase until the comparison engine is trustworthy.

---

# Claude Cloud execution plan

Use separate Cloud Sessions for bounded tasks.

Suggested sequence:

```text
01 foundation
02 DesignSpec
03 web inspector
04 Figma parser
05 matcher
06 comparator
07 report UI
08 visual diff
09 AI layer
10 XD plugin
11 source mapping
12 revalidation
13 hardening
```

Each session should:

1. Read `CLAUDE.md`.
2. Read the phase requirements.
3. Inspect existing code.
4. Implement only the selected phase.
5. Add tests.
6. Run tests/typecheck/lint.
7. Summarize files changed and remaining risks.

Do not delegate phases that have not yet had their interfaces stabilized.
