# Repository File Structure

```text
design-validator/
│
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (auth)/
│       │   ├── dashboard/
│       │   ├── projects/
│       │   ├── audits/
│       │   ├── settings/
│       │   └── api/
│       ├── components/
│       │   ├── layout/
│       │   ├── audit/
│       │   ├── issues/
│       │   ├── screenshots/
│       │   ├── sources/
│       │   └── ui/
│       ├── lib/
│       └── styles/
│
├── packages/
│   ├── design-spec/
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── schema.ts
│   │   │   ├── normalize.ts
│   │   │   ├── migrations.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── web-inspector/
│   │   ├── src/
│   │   │   ├── browser.ts
│   │   │   ├── navigation.ts
│   │   │   ├── stability.ts
│   │   │   ├── dom.ts
│   │   │   ├── computed-style.ts
│   │   │   ├── geometry.ts
│   │   │   ├── stylesheets.ts
│   │   │   ├── screenshots.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── figma-parser/
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── nodes.ts
│   │   │   ├── styles.ts
│   │   │   ├── variables.ts
│   │   │   ├── normalize.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── xd-parser/
│   │   ├── src/
│   │   │   ├── manifest-schema.ts
│   │   │   ├── validate.ts
│   │   │   ├── normalize.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── matcher/
│   │   ├── src/
│   │   │   ├── explicit.ts
│   │   │   ├── semantic.ts
│   │   │   ├── text.ts
│   │   │   ├── hierarchy.ts
│   │   │   ├── geometry.ts
│   │   │   ├── confidence.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── comparator/
│   │   ├── src/
│   │   │   ├── position.ts
│   │   │   ├── size.ts
│   │   │   ├── spacing.ts
│   │   │   ├── typography.ts
│   │   │   ├── color.ts
│   │   │   ├── border.ts
│   │   │   ├── radius.ts
│   │   │   ├── effects.ts
│   │   │   ├── layout.ts
│   │   │   ├── responsive.ts
│   │   │   ├── structure.ts
│   │   │   ├── dedupe.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── ai/
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── prompts.ts
│   │   │   ├── issue-explanations.ts
│   │   │   ├── css-recommendations.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   └── database/
│       ├── prisma/
│       └── src/
│
├── workers/
│   ├── website-inspection/
│   ├── figma-import/
│   ├── xd-import/
│   ├── comparison/
│   ├── visual-diff/
│   ├── ai-explanation/
│   └── cleanup/
│
├── plugins/
│   └── adobe-xd/
│       ├── manifest.json
│       ├── src/
│       │   ├── main.ts
│       │   ├── exporter.ts
│       │   ├── scenegraph.ts
│       │   ├── manifest.ts
│       │   └── ui.ts
│       └── README.md
│
├── fixtures/
│   ├── websites/
│   ├── figma/
│   ├── xd/
│   └── expected-reports/
│
├── scripts/
├── docs/
├── .github/
│   └── workflows/
├── CLAUDE.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Responsibility boundaries

### `apps/web`

Contains UI and API route composition only. Avoid putting the comparison algorithm here.

### `packages/design-spec`

The central type contract. Any source adapter that produces a DesignSpec must conform here.

### `packages/web-inspector`

Browser-only concerns. It should know about Playwright and DOM APIs, but not Figma.

### `packages/figma-parser`

Figma API and normalization only.

### `packages/xd-parser`

XD manifest validation and normalization only.

### `packages/matcher`

Find the corresponding design/implementation elements.

### `packages/comparator`

Measure differences only.

### `packages/ai`

Explain already-measured differences and produce suggestions.

### `workers`

Long-running orchestration. Keep transport details separate from domain packages.

### `fixtures`

Deterministic regression data. Every important comparator behavior should eventually have a fixture.
