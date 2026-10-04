# @design-validator/source-mapper

Source-code mapping (Phase 10): locates the stylesheet rules that style an inspected element and proposes a patch that
sets the design's required value.

- `parseStylesheet` — line-aware CSS/SCSS/Less rule extraction (nesting with `&`, `@media`, comments).
- `locateDeclarations` — ranks rules whose selectors match the element's real tag, id and classes, preferring rules that
  declare the issue's CSS property (or a shorthand of it).
- `proposePatch` — a unified diff replacing the declaration (shorthand-aware for `padding`, `margin`, `border-radius`),
  or adding a declaration when the rule has none. Values using `var()`/`calc()` are never rewritten; an override is added.
- `GitHubSource` — reads stylesheets from a public GitHub repository (`GITHUB_TOKEN` optional, raises rate limits).

Patches are suggestions derived from measured values; they are never applied automatically.
