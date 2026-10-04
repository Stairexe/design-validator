# @design-validator/web-inspector

Browser-only extraction: launches an isolated Playwright context, navigates, waits for a stable render, and captures DOM metadata, computed styles, geometry and screenshots, producing a Website `DesignSpec`.

**Boundary:** Knows about Playwright and DOM APIs. Must not know about Figma, Adobe XD, matching or comparison.

**Status:** package boundary only. Implemented in Phase 2 — Website Inspector (see `phases.md`).
