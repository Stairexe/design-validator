# Implementation Checklist

Use this as the master build checklist.

## Foundation

- [x] Monorepo initialized
- [x] TypeScript strict
- [x] Formatting/linting
- [x] Unit test runner
- [x] E2E runner
- [x] CI
- [x] PostgreSQL
- [x] Prisma
- [x] Redis
- [x] BullMQ
- [x] Object storage adapter
- [x] Environment variable validation

## DesignSpec

- [x] Schema
- [x] Versioning
- [x] Bounds
- [x] Spacing
- [x] Typography
- [x] Colors
- [x] Borders
- [x] Radius
- [x] Effects
- [x] Layout
- [x] Responsive metadata
- [x] Source metadata
- [x] Normalization tests

## Website inspector

- [x] URL validation
- [x] Browser isolation
- [x] Page navigation
- [x] Stable-render detection
- [x] DOM traversal
- [x] Visibility detection
- [x] Semantic role extraction
- [x] Computed CSS extraction
- [x] Geometry extraction
- [x] Font readiness
- [x] Screenshot capture
- [x] Multiple viewports
- [x] Inspector fixtures

## Figma

- [x] Auth/connect flow (server personal access token or uploaded export; per-user OAuth not yet implemented)
- [x] File retrieval
- [x] Node selection
- [x] Hierarchy traversal
- [x] Text extraction
- [x] Typography
- [x] Fills
- [x] Strokes
- [x] Radius
- [x] Auto layout
- [x] Geometry
- [x] Components/instances
- [x] Normalization
- [x] Fixtures

## Matching

- [x] Explicit IDs
- [x] Semantic role
- [x] Text similarity
- [x] Hierarchy
- [x] Geometry
- [x] Visual properties
- [x] Confidence
- [x] Ambiguity handling
- [x] Missing elements
- [x] Extra elements

## Comparison

- [x] Position
- [x] Width/height
- [x] Margin
- [x] Padding
- [x] Gap
- [x] Typography
- [x] Colors
- [x] Border
- [x] Radius
- [x] Effects
- [x] Layout behavior
- [x] Responsive behavior
- [x] Structure
- [x] Tolerances
- [x] Deduplication/grouping

## Results UX

- [x] Difference-first issue list
- [x] Category filters
- [x] Viewport filters
- [x] Current value
- [x] Required value
- [x] Delta
- [x] Severity
- [x] Element context
- [x] Issue details
- [x] Copy CSS
- [x] Unresolved matches
- [x] No primary page score

## Visual comparison

- [x] Side-by-side
- [x] Overlay
- [x] Difference view
- [x] Blink
- [x] Issue-region highlight

## Claude runtime

- [x] Anthropic client
- [x] Prompt versioning
- [x] Structured request
- [x] Structured response
- [x] Cache
- [x] Rate limits
- [x] AI disable switch
- [x] AI failure fallback
- [x] Recommendation labeling

## Adobe XD

- [x] UXP plugin shell
- [x] Scenegraph traversal
- [x] Manifest schema
- [x] Manifest export
- [x] Upload flow
- [x] Import normalization
- [x] Test fixtures

## Future code integration

- [x] Repository connection
- [x] DOM-to-source mapping
- [x] Code viewer
- [x] CSS diff editor
- [x] Suggested patch
- [ ] Preview build (the revalidation loop re-inspects a preview URL you deploy; building user code is out of scope)
- [x] Revalidation

## Production hardening

- [x] SSRF defenses
- [x] Worker isolation
- [x] Concurrency limits
- [x] Artifact quotas
- [x] Auth token encryption (no user tokens are stored; server tokens live in platform secrets)
- [x] Audit retention policy
- [x] Error monitoring (structured logs + `onRequestError`; plug in a provider via the log drain)
- [x] Audit logs
- [x] Rate limiting
- [ ] Billing (not implemented: requires pricing decisions and a payment-provider account)
- [x] Data deletion
