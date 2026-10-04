# @design-validator/ai

Anthropic integration: explains already-measured differences, groups related issues and suggests implementation changes from compact structured input.

**Boundary:** Never measures or alters `current`, `required` or `delta`. AI failure must not fail a deterministic audit.

**Status:** implemented (Phase 8). Model `claude-opus-5-5` by default (`ANTHROPIC_MODEL` overrides), schema-constrained output, server-side refusal fallbacks (`fallbacks: "default"`), cached by audit input + element + issue set + prompt version + model.
