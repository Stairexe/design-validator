# Design Validator — Engineering Documentation

This documentation defines the architecture, product behavior, data model, implementation phases, repository structure, development workflow, and AI-assisted development rules for **Design Validator**.

## Product definition

Design Validator compares a rendered website implementation at a specific URL against a design specification imported from **Figma** or **Adobe XD**.

The product is **difference-first**. The primary output is not a page score.

Example:

```text
Hero Button

Padding
  Current: 20px
  Required: 24px
  Change: +4px

Border radius
  Current: 8px
  Required: 12px
  Change: +4px
```

Another example:

```text
Heading

Font size
  Current: 44px
  Required: 48px

Line height
  Current: 52px
  Required: 56px
```

A numerical confidence value may exist internally for matching, but **must not be presented as a page-quality score in the primary UX**.

## Documentation map

- `CLAUDE.md` — instructions Claude Code must follow while implementing the repository.
- `architecture.md` — system architecture and technical decisions.
- `product-spec.md` — functional product requirements and user flows.
- `design-spec.md` — canonical normalized design schema shared by all sources.
- `comparison-engine.md` — matching, comparison, tolerances, issue generation, and fix representation.
- `phases.md` — implementation phases, dependencies, acceptance criteria, and Claude Cloud task split.
- `file-structure.md` — repository layout and responsibility of every major directory.
- `api-and-jobs.md` — API contracts, background jobs, persistence, and execution states.
- `testing.md` — testing strategy, fixtures, regression cases, and quality gates.

## Non-negotiable architecture rule

The system does not perform literal CSS string comparison between a website and Figma/XD.

Instead:

```text
Website
  -> browser inspection
  -> resolved/rendered properties
  -> Website DesignSpec

Figma
  -> design document parsing
  -> Figma DesignSpec

Adobe XD
  -> XD plugin manifest
  -> XD DesignSpec

DesignSpec A + DesignSpec B
  -> element matching
  -> deterministic property comparison
  -> ValidationIssue[]
  -> optional Claude explanation/fix suggestion
```

The deterministic comparison engine is the source of truth for measured differences. Claude is an explanation and remediation layer, not the numerical authority.

## MVP scope

The first release supports:

1. One target website URL.
2. One Figma source.
3. Desktop and mobile viewport validation.
4. DOM + computed-style + geometry extraction with Playwright.
5. Figma node/style/layout extraction.
6. Normalization into DesignSpec.
7. Element matching.
8. Differences for geometry, spacing, typography, color, border/radius, and core layout.
9. Side-by-side and overlay screenshots.
10. Difference-first issue report.
11. Optional Claude-generated explanation and CSS guidance.

Adobe XD, source-code mapping, GitHub patches, and autonomous re-validation are planned after the MVP.

## Status

All phases in `phases.md` are implemented: website inspection, Figma and Adobe XD import, deterministic matching and
comparison, the difference-first results UI, visual comparison, optional Claude recommendations, source-code mapping,
re-validation and production hardening. Not implemented: billing, per-user Figma OAuth, and automatically building a
user's code for re-validation (re-validate against a preview URL you deploy instead).

## Development

Requirements: Node.js 22.12+ (`.nvmrc`), pnpm 10 (`corepack enable`). Docker is optional (local services).

```bash
pnpm install                      # also generates the Prisma client
cp .env.example .env              # minimal local setup:
                                  #   STORAGE_DRIVER=filesystem, INSPECTOR_ALLOW_PRIVATE_HOSTS=true, DATABASE_URL= (empty)
pnpm --filter @design-validator/web exec playwright install chromium   # browser for the inspector
pnpm --filter @design-validator/web dev                                # http://localhost:3000 → "Run sample audit"
```

With PostgreSQL, Redis and MinIO (`docker compose up -d`, then `pnpm db:migrate:deploy`) set `DATABASE_URL`,
`STORAGE_DRIVER=s3` and `AUDIT_EXECUTION=queue`, and run `pnpm dev` to start the web app and every worker.

| Command | Purpose |
| --- | --- |
| `pnpm lint` / `pnpm format:check` | ESLint (type-aware) and Prettier |
| `pnpm typecheck` | `tsc --noEmit` in every workspace package |
| `pnpm test` | Vitest: unit, Chromium integration, regression fixtures; PostgreSQL/Redis tests run when `DATABASE_URL` / `REDIS_URL` are set |
| `pnpm build` | Production build of the web app |
| `pnpm test:e2e` | Playwright end-to-end tests against the production build (run `pnpm build` first) |
| `pnpm db:migrate` / `pnpm db:check` | Create migrations / verify the migrated database matches `schema.prisma` |
| `pnpm validate` | Format check, lint, typecheck, test and build |

## Deployment

**Vercel** (inline mode): project root `apps/web`; set `STORAGE_DRIVER=vercel-blob` with a private Blob store
(`BLOB_READ_WRITE_TOKEN`), and optionally `DATABASE_URL` (Postgres), `FIGMA_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`,
`APP_ACCESS_PASSWORD` and `CRON_SECRET` (daily retention via `apps/web/vercel.json`).

**Containers/VMs** (queue mode): run the web app plus the seven `workers/*` processes with PostgreSQL, Redis and
S3-compatible storage.

Environment variables are validated at startup; see `.env.example`. Package responsibilities are in `file-structure.md`;
the enforced dependency rules are in `tests/repository/boundaries.test.ts`.
