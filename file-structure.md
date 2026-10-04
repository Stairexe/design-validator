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
│   ├── database/
│   │   ├── prisma/
│   │   └── src/
│   │
│   ├── config/          # environment-variable schemas and validation
│   ├── jobs/            # queue names, audit stages, job envelope, worker bootstrap
│   └── storage/         # S3-compatible object storage abstraction
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
├── tests/
│   └── repository/      # cross-package checks (boundaries, shared vocabularies)
├── scripts/
├── .github/
│   └── workflows/
├── *.md                 # project documentation (kept at the root; see below)
├── .env.example
├── docker-compose.yml   # local PostgreSQL, Redis and MinIO
├── eslint.config.mjs
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
└── vitest.config.ts
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

### `packages/database`

Prisma schema, migrations and client factory. Durable metadata only; large artifacts go to object storage.

### `packages/config`

Composable environment-variable schemas. Every runtime validates the variables it needs at startup.

### `packages/jobs`

Transport contracts shared by the web app and workers: queue names, audit stages, the job envelope, idempotency keys, typed failure codes and the BullMQ worker bootstrap.

### `packages/storage`

`ObjectStorage` interface with S3-compatible and in-memory implementations.

### `workers`

Long-running orchestration. Keep transport details separate from domain packages.

### `fixtures`

Deterministic regression data. Every important comparator behavior should eventually have a fixture.

## Foundation decisions (Phase 0)

These deviate from or extend the tree above; each has a reason.

- **`packages/config`, `packages/jobs`, `packages/storage` were added.** The architecture requires environment validation, a queue shared by the web app and seven workers, and object storage, but the tree had no home for them. Putting them in `apps/web` would couple workers to the UI; putting them in each worker would duplicate them.
- **Documentation stays at the repository root** rather than `docs/`, because `CLAUDE.md` and the session prompts reference root paths.
- **Internal packages are consumed as TypeScript source** (`exports` → `src/index.ts`) instead of being pre-built. Next.js compiles them for the web app and workers run through `tsx`, so there is no package build ordering to maintain. Revisit when deploying workers (Phase 12).
- **Allowed dependencies between packages are enforced by `tests/repository/boundaries.test.ts`.** Changing that matrix is an architectural decision and must be documented.
- **Environment:** one git-ignored root `.env` (template: `.env.example`) is read by Next.js (`next.config.ts`), the Prisma CLI (`prisma.config.ts`) and workers (`--env-file-if-exists`).
