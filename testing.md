# Testing Strategy

## 1. Test pyramid

```text
                     E2E
                  /       \
             Integration   Visual
               /       \
          Unit / Domain
```

Most confidence should come from deterministic unit/domain tests.

## 2. DesignSpec tests

Test:

- schema validation,
- schema migration,
- unit normalization,
- color normalization,
- font-weight normalization,
- handling of null/unknown values.

## 3. Inspector tests

Use a controlled local fixture server.

Fixtures should cover:

- plain HTML/CSS,
- flexbox,
- grid,
- nested containers,
- inherited typography,
- CSS variables,
- media queries,
- pseudo elements where feasible,
- web fonts,
- lazy-loaded images,
- runtime style updates.

Repeated runs should be checked for acceptable stability.

## 4. Figma parser tests

Use sanitized recorded responses or static fixture JSON.

Test:

- frame traversal,
- nested auto-layout,
- text nodes,
- components,
- instances,
- fills,
- strokes,
- radii,
- typography,
- geometry,
- missing optional fields.

## 5. Matcher tests

Test:

```text
same name
same text / different name
same role / different tag
nested wrappers
multiple repeated cards
missing design element
extra website element
ambiguous candidate
```

## 6. Comparator tests

Minimum required cases:

### Spacing

```text
20 vs 24 → difference +4
20 vs 21 with tolerance 2 → no issue
```

### Typography

```text
44 vs 48 → difference +4px
700 vs 600 → weight difference
```

### Color

```text
#fff vs rgba(255,255,255,1) → equal
```

### Geometry

```text
width 200 vs 204 → difference +4px
```

### Structure

```text
3 design cards vs 4 website cards → extra implementation element
```

## 7. AI layer tests

Do not test for a specific prose sentence.

Test the contract:

- valid input schema,
- valid output schema,
- measured values remain unchanged,
- malformed AI output is rejected or safely degraded,
- AI outage does not fail deterministic comparison.

## 8. E2E flow

The first complete E2E test should be:

```text
Open app
→ create project
→ enter fixture URL
→ select fixture design
→ run audit
→ wait for completion
→ open issue
→ verify Current = 20px
→ verify Required = 24px
→ verify Delta = +4px
```

## 9. Visual regression

Use stable fixture pages for screenshot tests.

Keep visual baselines limited to major UI and screenshot-diff states because screenshot tests can be noisy across browsers/environments.

## 10. Quality gates

Every PR should run:

```text
lint
format check
typecheck
unit tests
integration tests
build
```

Changes to comparison rules require fixture updates or an explicit reason why no fixture is appropriate.
