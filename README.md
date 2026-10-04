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

## Development

Requirements: Node.js 22.12+ (`.nvmrc`), pnpm 10 (`corepack enable`), Docker for local services.

```bash
pnpm install                 # also generates the Prisma client
cp .env.example .env         # fill in local values; .env is git-ignored
docker compose up -d         # PostgreSQL, Redis, MinIO
pnpm db:migrate:deploy       # apply database migrations
pnpm dev                     # web app (http://localhost:3000) and all workers
```

| Command | Purpose |
| --- | --- |
| `pnpm lint` / `pnpm format:check` | ESLint (type-aware) and Prettier |
| `pnpm typecheck` | `tsc --noEmit` in every workspace package |
| `pnpm test` | Vitest unit tests; database/Redis integration tests also run when `DATABASE_URL` / `REDIS_URL` are set |
| `pnpm build` | Production build of the web app |
| `pnpm test:e2e` | Playwright tests against the production build (run `pnpm build` first) |
| `pnpm db:migrate` | Create and apply a migration during development |
| `pnpm db:check` | Verify the migrated database matches `schema.prisma` |
| `pnpm validate` | Format check, lint, typecheck, test and build |

Environment variables are validated at startup by `packages/config`; every runtime reads the root `.env`. See `file-structure.md` for package responsibilities and `tests/repository/boundaries.test.ts` for the enforced dependency rules between packages.
