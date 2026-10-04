# Claude Cloud Development Workflow

## What Claude Cloud is for

Use Claude Code Cloud Sessions as the remote engineering environment for implementing well-defined tasks in the GitHub repository.

Use the Anthropic API inside the finished product only for optional runtime explanations and recommendations.

These are separate concerns.

## Recommended workflow

### 1. Connect GitHub repository

Start Claude Code Cloud against the repository.

### 2. Keep architecture in-repo

The following files should always be available to Claude:

```text
CLAUDE.md
architecture.md
product-spec.md
design-spec.md
comparison-engine.md
phases.md
file-structure.md
api-and-jobs.md
testing.md
```

### 3. One bounded task per cloud session

Good:

```text
Implement Phase 2 website inspector only.
```

Bad:

```text
Build the whole SaaS.
```

### 4. Require tests

Every implementation session should include:

```text
implement
→ test
→ typecheck
→ lint
→ report
```

### 5. Use GitHub PRs

For meaningful phases, ask Claude Cloud to create a focused branch/PR rather than mixing unrelated work.

## Suggested session prompts

### Foundation

```text
Read CLAUDE.md, architecture.md, phases.md and file-structure.md.
Implement Phase 0 only.
Do not implement application features beyond the repository foundation.
Add tests and CI.
```

### DesignSpec

```text
Read CLAUDE.md, design-spec.md, comparison-engine.md and Phase 1 in phases.md.
Implement the DesignSpec package and fixtures.
Do not implement Figma, XD, browser inspection, or AI features yet.
```

### Website inspector

```text
Read CLAUDE.md, architecture.md, design-spec.md and Phase 2 in phases.md.
Implement the Playwright website inspector.
Return a normalized DesignSpec and screenshot per viewport.
Keep browser-specific logic inside packages/web-inspector.
Add deterministic local fixture tests.
```

### Figma

```text
Read CLAUDE.md, design-spec.md and Phase 3 in phases.md.
Implement the Figma adapter only.
Do not put Figma API objects into comparator code.
Add static fixtures and tests.
```

### Comparator

```text
Read CLAUDE.md and comparison-engine.md.
Implement the deterministic comparison engine.
The output must be exact current → required differences.
Do not add page scoring.
Add fixtures for every supported comparator.
```

### Results UI

```text
Read product-spec.md and comparison-engine.md.
Build the issue-first audit results UI.
Do not add a page score.
Each issue must show element, property, current, required, and delta where applicable.
```

### Claude recommendation layer

```text
Read CLAUDE.md, comparison-engine.md and api-and-jobs.md.
Implement the Anthropic client behind packages/ai.
Send compact structured differences only.
Claude may explain and recommend fixes but may not alter deterministic measured values.
```

## Context management

Keep reusable architecture knowledge in repository docs and `CLAUDE.md` instead of repeating huge prompts.

Do not paste generated screenshots or complete design exports into every coding session unless the task genuinely requires them.

## Session completion checklist

At the end of every Cloud Session, Claude should report:

```text
Implemented:
- ...

Tests:
- ...

Files changed:
- ...

Known limitations:
- ...

Next recommended task:
- ...
```
