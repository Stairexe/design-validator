# Architecture

## 1. System overview

```text
                    ┌────────────────────────────┐
                    │          Web App           │
                    │ Next.js / React / TS       │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │        Application API     │
                    │ auth / projects / audits   │
                    └─────────────┬──────────────┘
                                  │
                         enqueue audit job
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │       Job Queue            │
                    │ Redis + BullMQ              │
                    └───────┬─────────┬──────────┘
                            │         │
                ┌───────────┘         └──────────────┐
                ▼                                    ▼
      ┌─────────────────────┐             ┌────────────────────┐
      │ Website Worker      │             │ Design Worker       │
      │ Playwright          │             │ Figma / XD          │
      └──────────┬──────────┘             └──────────┬─────────┘
                 │                                   │
                 ▼                                   ▼
        Website DesignSpec                    Design DesignSpec
                 │                                   │
                 └────────────────┬──────────────────┘
                                  ▼
                       ┌────────────────────┐
                       │ Normalization      │
                       └─────────┬──────────┘
                                 ▼
                       ┌────────────────────┐
                       │ Element Matcher    │
                       └─────────┬──────────┘
                                 ▼
                       ┌────────────────────┐
                       │ Comparator Engine  │
                       └─────────┬──────────┘
                                 ▼
                       ┌────────────────────┐
                       │ Validation Issues  │
                       └─────────┬──────────┘
                                 │
                    optional AI explanation
                                 │
                                 ▼
                       ┌────────────────────┐
                       │ Anthropic API      │
                       │ explanation/fixes  │
                       └─────────┬──────────┘
                                 ▼
                       ┌────────────────────┐
                       │ Report / Diff UI   │
                       └────────────────────┘
```

## 2. Design principles

### Deterministic core

The numeric comparison must work without an LLM. The engine must be testable with fixed fixtures and produce the same result from the same inputs.

### Source-independent core

Figma and Adobe XD are not browser CSS sources. They provide design structures and properties. Both must be converted to `DesignSpec`.

### Render-aware website inspection

The website side must capture computed/rendered state, not only original stylesheet text. Browser cascade, inheritance, responsive rules and runtime styles can change the final result.

### Explain, don't measure with AI

Claude can explain why a measured difference may exist and propose a code change. Claude must not invent measured values or become the scoring authority.

### Async-first execution

Browser rendering, screenshots, Figma retrieval, and large document processing are job work. The UI should submit a job and subscribe/poll for progress.

## 3. Main services

### Web application

Responsibilities:

- authentication,
- project management,
- audit creation,
- source configuration,
- progress display,
- results display,
- screenshot viewer,
- issue filtering,
- optional CSS suggestion UI.

### Website inspector

Responsibilities:

- launch isolated browser context,
- navigate to exact URL,
- wait for stable render,
- capture DOM metadata,
- capture computed styles,
- capture geometry,
- capture screenshots,
- collect stylesheet references,
- record viewport metadata.

### Figma parser

Responsibilities:

- authenticate against Figma when needed,
- fetch relevant file/node data,
- extract hierarchy and design properties,
- normalize into DesignSpec.

### XD parser

MVP interface only. Long-term implementation consumes a JSON manifest exported by an Adobe XD UXP plugin.

Responsibilities:

- validate manifest,
- validate schema version,
- normalize plugin output into DesignSpec.

### Matcher

Maps design elements to website elements.

The matcher must return:

- match ID pair,
- method(s) used,
- confidence,
- ambiguous flag.

The matcher must never silently pretend an uncertain mapping is exact.

### Comparator

Consumes matched elements and returns `ValidationIssue[]`.

### AI service

Receives compact issue groups and produces:

- explanation,
- probable causes,
- suggested CSS or implementation change,
- grouping labels,
- optional natural-language summary.

## 4. Storage

### PostgreSQL

Store durable metadata:

- users,
- projects,
- design sources,
- audits,
- audit settings,
- job state,
- issues,
- source mappings,
- model recommendations.

Do not store massive page snapshots in relational rows when object storage is more suitable.

### Object storage

Store:

- screenshots,
- raw manifests where permitted,
- normalized snapshots,
- diagnostic bundles,
- exports.

## 5. Queue architecture

Use Redis + BullMQ initially.

Suggested queues:

```text
website-inspection
figma-import
xd-import
comparison
visual-diff
ai-explanation
cleanup
```

Each queue is consumed by the `workers/` package of the same name. (`visual-diff` was previously listed here as `screenshot-diff`; it was renamed to match `workers/visual-diff` and the `VISUAL_DIFF` audit stage.)

Each job should be idempotent by `auditId + stage + inputHash`.

## 6. Browser inspection architecture

For every viewport:

```text
createContext(viewport)
  -> navigate(url)
  -> waitForStablePage()
  -> collectDOM()
  -> collectComputedStyles()
  -> collectGeometry()
  -> captureScreenshot()
  -> build DesignSpec
```

Do not use a single fixed sleep as the only stabilization mechanism.

Use a combination of:

- DOM readiness,
- network-idle signal where appropriate,
- image/font readiness checks,
- bounded stabilization delay,
- maximum navigation timeout.

The inspector must record what assumptions were used to declare the page stable.

## 7. Security boundaries

Website URLs are untrusted input.

The browser worker must be isolated and should restrict dangerous network capabilities where possible.

Protect against:

- SSRF,
- localhost/internal IP access,
- file URL access,
- credential leakage,
- unbounded resource usage,
- malicious pages attempting to affect the worker.

Do not reuse privileged application cookies in audit browsers.

Figma OAuth tokens must be encrypted at rest and never sent to client-side logs.

## 8. Failure strategy

Every stage must produce typed failures.

Examples:

```text
INVALID_URL
NAVIGATION_TIMEOUT
AUTH_REQUIRED
PAGE_RENDER_FAILED
NO_VISIBLE_ELEMENTS
FIGMA_AUTH_FAILED
FIGMA_NODE_NOT_FOUND
XD_MANIFEST_INVALID
MATCHING_TOO_AMBIGUOUS
COMPARISON_FAILED
AI_PROVIDER_FAILED
```

An AI failure must not invalidate an otherwise successful deterministic audit.

## 9. Observability

Every audit should expose:

- audit ID,
- project ID,
- stage,
- start/end timestamps,
- viewport,
- source IDs,
- browser status,
- count of inspected elements,
- count of matched elements,
- count of generated issues,
- AI call status when used.

Use structured logs with request/job IDs.

## 10. Implementation notes: execution and deployment modes

The architecture above is implemented with two interchangeable execution modes, because not every host can run
long-lived queue workers:

| | Queue mode (`AUDIT_EXECUTION=queue`) | Inline mode (default) |
| --- | --- | --- |
| Where stages run | `workers/*` BullMQ consumers | the web process, after the response (`after()`) |
| Orchestration | FlowProducer: website inspection ∥ design import → comparison → (AI) | sequential, same stage functions |
| Typical host | Docker/VM with Redis | Vercel (Fluid compute, `maxDuration` 300 s) |

Both modes call the same stage functions in `packages/pipeline`, record idempotent stage runs keyed by
`hash(auditId + stage + inputHash + viewportId)`, and write artifacts to deterministic object keys.

Persistence is a port (`AuditRepository`) with two adapters: PostgreSQL via Prisma when `DATABASE_URL` is set, and JSON
documents in object storage otherwise (small single-tenant deployments). Object storage drivers: S3-compatible, Vercel
Blob (private), filesystem and memory. On serverless hosts the inspector uses `@sparticuz/chromium` (Chromium 141,
matching `playwright-core` 1.56).

When the design source cannot export an image (uploaded Figma JSON, XD manifests, no Figma token), visual comparison
renders the normalized DesignSpec to an image and labels it "rendered from design data". Visual evidence never creates or
changes measured issues.
