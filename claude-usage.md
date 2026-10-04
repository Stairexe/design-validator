# Claude Usage and Development Strategy

## Cloud Sessions vs runtime API

These are two separate uses of Anthropic:

### Claude Code Cloud Sessions

Use Cloud Sessions to develop the repository. Connect the GitHub repository, give Claude a bounded engineering task, and let it implement, test and prepare changes in an isolated cloud environment.

Cloud Sessions share usage/rate limits with other Claude Code usage. They are therefore best used for focused implementation tasks rather than repeatedly asking Claude to re-read and modify the whole repository.

### Anthropic API

The finished Design Validator should use the Anthropic API for optional runtime AI recommendations. The application's server owns the API credential and controls when requests are made.

A Claude consumer subscription and your application's production API consumption are different billing/usage concepts.

## Token-saving architecture

Use Claude heavily during development, but keep the runtime deterministic.

```text
                 DEVELOPMENT

Claude Cloud
     ↓
Repository implementation
     ↓
Tests / PRs

                 RUNTIME

Website → deterministic inspector
Figma/XD → deterministic importer
          ↓
       DesignSpec
          ↓
   deterministic matcher
          ↓
   deterministic comparator
          ↓
    exact differences
          ↓
     Claude API (optional)
          ↓
 explanations / recommendations
```

## Do not use Claude for

- pixel arithmetic,
- comparing numeric padding values,
- color equality,
- tolerance checks,
- counting issues,
- generating the canonical report object.

## Use Claude for

- diagnosing likely CSS causes,
- grouping related issues,
- explaining implementation implications,
- producing minimal CSS recommendations,
- suggesting how to resolve ambiguous matches,
- assisting developers during construction of the product.

## Practical Cloud Session discipline

Keep tasks narrow.

Preferred:

```text
Implement the spacing comparator and tests.
```

Not preferred:

```text
Read everything and improve the entire application.
```

Store permanent architecture knowledge in repository files rather than in repeated prompts.

## Recommended context files

Claude should normally start from:

```text
CLAUDE.md
README.md
architecture.md
phases.md
```

Then read only the package-specific document relevant to the task.

## Parallelization

Cloud Sessions can be used for independent tasks, but avoid parallel edits to the same architectural files.

Good parallel work:

```text
Session A → comparator tests
Session B → results UI components
Session C → documentation updates
```

Risky parallel work:

```text
Session A → rewrite DesignSpec
Session B → rewrite DesignSpec
```

## Runtime API budget controls

The application should support:

- per-audit AI enable/disable,
- issue grouping before AI calls,
- response caching,
- model selection by task,
- request-size limits,
- retry limits,
- audit-level AI budget.

## Recommended MVP AI behavior

Only call Claude when the user opens an issue or explicitly requests recommendations, rather than automatically calling Claude for every issue during the audit.

This allows the deterministic report to complete quickly and keeps AI usage tied to user value.

## Current-source references

Anthropic — Claude Code on the web / Cloud Sessions:
https://claude.com/blog/claude-code-on-the-web

Anthropic Help Center — Manage usage credits for paid Claude plans:
https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans
