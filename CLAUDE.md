# CLAUDE.md — Design Validator

You are working on a production-oriented application called **Design Validator**.

## Mission

Build a tool that answers one question:

> What is different between the live website implementation and the intended Figma/Adobe XD design, and exactly what needs to change?

The primary output must therefore be **actionable differences**, not a page score.

## Absolute product rules

1. Never replace the primary issue report with an overall score.
2. Never compare raw CSS strings as the core comparison method.
3. Never make Claude the authority for numeric differences.
4. Never send an entire website HTML dump or complete design file to Claude when a compact structured diff is sufficient.
5. Every issue must identify an element and a measurable property wherever technically possible.
6. Prefer exact `current`, `required`, and `delta` values.
7. Preserve units and normalize them before comparison.
8. Use configurable tolerances. A tiny rendering difference must not become a false positive.
9. Design-tool parsers must output the common DesignSpec schema.
10. Source-specific logic must remain outside the comparison engine.

## Required issue wording

The UI should prefer patterns like:

```text
Button / Primary CTA

Padding X
  Current: 20px
  Required: 24px
  Change: +4px

Radius
  Current: 8px
  Required: 12px
  Change: +4px
```

Avoid vague wording such as:

```text
The button is slightly wrong.
```

## System of truth

Use this hierarchy:

1. Browser-resolved/rendered measurement for the website.
2. Parsed, explicit design properties for Figma/XD.
3. Deterministic normalization.
4. Deterministic element matching and property comparison.
5. Claude only for explanation, grouping, root-cause hypotheses, and suggested implementation changes.

## Repository rules

- TypeScript strict mode.
- Small modules.
- No giant catch-all service files.
- No business logic inside React components when it belongs in packages or services.
- Shared types live in `packages/design-spec`.
- Comparison rules live in `packages/comparator`.
- Matching rules live in `packages/matcher`.
- Browser extraction lives in `packages/web-inspector`.
- Figma-specific parsing lives in `packages/figma-parser`.
- Adobe XD manifest parsing lives in `packages/xd-parser`.
- Anthropic integration lives in `packages/ai`.
- Long-running work belongs in `workers/` and is triggered through queue jobs.

## Development order

When starting an unfamiliar task:

1. Read `README.md`.
2. Read `architecture.md`.
3. Read the relevant package documentation.
4. Inspect existing tests and fixtures.
5. Make the smallest change that satisfies the task.
6. Add or update tests.
7. Run the narrowest relevant test suite.
8. Run the full validation suite before declaring completion.

## Do not prematurely build

Do not add these during foundational phases unless the current task explicitly requires them:

- Billing.
- Team collaboration.
- Marketplace integrations.
- Browser extension.
- GitHub auto-patching.
- Autonomous agents that modify websites.
- Raw Adobe XD binary parsing.

## AI usage rules

Claude API calls must use structured inputs.

Preferred:

```json
{
  "element": "hero-button",
  "issues": [
    {
      "property": "paddingInline",
      "current": "20px",
      "required": "24px",
      "delta": "+4px"
    }
  ]
}
```

Avoid:

```text
Here is 200,000 characters of website HTML. Tell me what is wrong.
```

Claude output must never overwrite measured `current`, `required`, or `delta` values.

## Validation requirement

A feature is not complete when it compiles. It is complete when:

- the implementation is typed,
- relevant tests pass,
- the behavior is represented in a fixture when appropriate,
- errors are handled,
- and the resulting user-facing behavior matches `product-spec.md`.

## Commit guidance

Prefer focused commits:

```text
feat(inspector): capture computed styles
feat(figma): normalize text nodes
feat(comparator): add spacing comparison
feat(report): add difference inspector
fix(matcher): improve text confidence
```

Avoid large mixed-purpose commits.
