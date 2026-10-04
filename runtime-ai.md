# Runtime AI Architecture

## Purpose

Claude is optional intelligence layered on top of deterministic validation.

## What Claude receives

Claude should receive the smallest useful context:

- element name,
- selector when safe,
- design/implementation relationship,
- measured differences,
- relevant local CSS snippet only when available,
- surrounding component context only when required.

## What Claude does

1. Explain likely causes.
2. Group correlated issues.
3. Recommend the smallest practical CSS/code change.
4. Explain trade-offs when a change could affect other breakpoints.

## What Claude does not do

- decide whether 20 equals 24,
- invent measured values,
- redefine tolerance thresholds without explicit configuration,
- silently discard issues,
- rewrite the complete site.

## AI response schema

```ts
interface AIRecommendation {
  issueId: string;
  explanation: string;
  probableCause?: string;
  recommendedChange?: {
    language: 'css' | 'scss' | 'tailwind' | 'javascript' | 'typescript' | 'other';
    code: string;
  };
  caveats?: string[];
}
```

## Prompt shape

System instructions should establish:

```text
You are a design-to-code diagnostic assistant.
Measured comparison values are authoritative.
Do not change numeric values from the issue payload.
Explain likely implementation causes.
Prefer minimal changes.
Call out uncertainty.
```

User payload should be compact JSON.

## Cost control

Do not send one AI request per CSS property if the issues can be grouped safely.

Prefer:

```text
one request per element or small related issue group
```

over:

```text
one request per property
```

Cache recommendations by a stable hash of:

```text
audit input hash
+
element identifier
+
normalized issue set
+
prompt version
+
model identifier
```

## Failure behavior

If the Anthropic call fails:

```text
Measured differences remain visible.
AI recommendation area shows unavailable state.
Audit remains complete.
```

The product must never become unusable because an AI provider is temporarily unavailable.
