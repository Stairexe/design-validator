# @design-validator/ai

Anthropic integration: explains already-measured differences, groups related issues and suggests implementation changes from compact structured input.

**Boundary:** Never measures or alters `current`, `required` or `delta`. AI failure must not fail a deterministic audit.

**Status:** package boundary only. Implemented in Phase 8 — Claude Recommendation Layer (see `phases.md`).
