# Fixtures

Deterministic regression data shared across packages (see `testing.md`).

```text
fixtures/
├── websites/          # static fixture pages served locally to the web inspector
├── figma/             # sanitized Figma API responses
├── xd/                # Adobe XD plugin manifests
└── expected-reports/  # expected ValidationReport output for comparator regression tests
```

Fixtures are added alongside the phase that needs them. Never commit real customer designs,
credentials or unsanitized API responses.
