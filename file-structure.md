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
│   ├── storage/         # object storage: S3-compatible, Vercel Blob, filesystem, memory
│   ├── pipeline/        # audit orchestration (inline and queue), services used by the web app
│   ├── visual-diff/     # pixel diff and design rendering for visual evidence
│   └── source-mapper/   # stylesheet lookup and patch proposals (Phase 10)
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

`ObjectStorage` interface with S3-compatible, Vercel Blob, filesystem and in-memory implementations.

### `packages/pipeline`

The only package that composes inspection, design import, matching, comparison, visual diff, AI and source mapping.
Exposes stage functions (used by both the inline runner and the queue workers) and the services the web app calls.
The web app depends on the pipeline, never on the domain packages directly.

### `packages/visual-diff` and `packages/source-mapper`

Pixel difference and design rendering (Phase 7); stylesheet rule lookup and patch proposals for a connected GitHub
repository (Phase 10).

### `plugins/adobe-xd`

UXP plugin exporting artboards as a versioned manifest (Phase 9). Shares only the manifest types with `xd-parser`.

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
- **Phases 1–12 added `pipeline`, `visual-diff` and `source-mapper`** (see their READMEs) and `fixtures/source-repo/`. Workers are transport only: each wraps a pipeline stage function. The comparator has no separate `responsive.ts`; per-viewport visibility mismatches are produced by `structure.ts`.
