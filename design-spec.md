# DesignSpec — Canonical Internal Representation

## Purpose

`DesignSpec` is the contract between source adapters and the comparison engine.

Sources:

- website,
- Figma,
- Adobe XD,
- future design sources.

The comparator must know nothing about Figma API object shapes or browser DOM objects.

## Schema principles

- Explicit units.
- Nullable values when a source cannot provide a property.
- Preserve raw source IDs in `source` metadata.
- Separate semantic identity from source identity.
- Separate declared design values from measured values.

## Top-level shape

```ts
export interface DesignSpec {
  schemaVersion: string;
  source: DesignSource;
  document: DesignDocument;
  viewports: DesignViewport[];
  pages: DesignPage[];
  tokens?: DesignToken[];
  metadata: Record<string, unknown>;
}
```

## Source

```ts
export type DesignSourceType =
  | 'website'
  | 'figma'
  | 'adobe-xd';

export interface DesignSource {
  type: DesignSourceType;
  id?: string;
  name?: string;
  uri?: string;
  version?: string;
}
```

## Document

```ts
export interface DesignDocument {
  id: string;
  name: string;
  width?: number;
  height?: number;
}
```

## Viewport

```ts
export interface DesignViewport {
  id: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
  label?: string;
}
```

## Page

```ts
export interface DesignPage {
  id: string;
  name: string;
  rootIds: string[];
  elements: DesignElement[];
}
```

## Element

```ts
export interface DesignElement {
  id: string;
  name?: string;
  type: DesignElementType;
  role?: DesignRole;
  parentId?: string | null;
  childIds: string[];
  text?: string;
  bounds: Bounds;
  visibility: Visibility;
  layout: LayoutProperties;
  spacing: SpacingProperties;
  typography?: TypographyProperties;
  colors: ColorProperties;
  border: BorderProperties;
  radius: RadiusProperties;
  effects: EffectProperties;
  source: SourceElementMetadata;
  responsive?: ResponsiveProperties;
}
```

## Element types

```ts
export type DesignElementType =
  | 'page'
  | 'frame'
  | 'section'
  | 'container'
  | 'component'
  | 'instance'
  | 'text'
  | 'button'
  | 'image'
  | 'shape'
  | 'icon'
  | 'input'
  | 'link'
  | 'list'
  | 'unknown';
```

## Roles

```ts
export type DesignRole =
  | 'heading'
  | 'paragraph'
  | 'button'
  | 'navigation'
  | 'card'
  | 'image'
  | 'input'
  | 'label'
  | 'link'
  | 'section'
  | 'container'
  | 'unknown';
```

## Bounds

All distances are CSS pixels after normalization.

```ts
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

## Spacing

```ts
export interface SpacingProperties {
  margin?: BoxSpacing;
  padding?: BoxSpacing;
  gap?: number | null;
  rowGap?: number | null;
  columnGap?: number | null;
}

export interface BoxSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
```

## Typography

```ts
export interface TypographyProperties {
  fontFamily?: string | null;
  fontSize?: number | null;
  fontWeight?: number | string | null;
  lineHeight?: number | string | null;
  letterSpacing?: number | null;
  textTransform?: string | null;
  textAlign?: string | null;
  color?: ColorValue | null;
}
```

## Colors

Normalize colors into an equivalent representation before comparison.

```ts
export interface ColorValue {
  hex: string;
  alpha: number;
}

export interface ColorProperties {
  text?: ColorValue | null;
  background?: ColorValue | null;
  fill?: ColorValue | null;
  border?: ColorValue | null;
}
```

## Layout

```ts
export interface LayoutProperties {
  display?: string | null;
  position?: string | null;
  flexDirection?: string | null;
  alignItems?: string | null;
  justifyContent?: string | null;
  flexWrap?: string | null;
  gridTemplateColumns?: string | null;
  gridTemplateRows?: string | null;
  overflow?: string | null;
}
```

## Border and radius

```ts
export interface BorderProperties {
  width: BoxSpacing;
  style?: string | null;
  color?: ColorValue | null;
}

export interface RadiusProperties {
  topLeft?: number | null;
  topRight?: number | null;
  bottomRight?: number | null;
  bottomLeft?: number | null;
}
```

## Effects

```ts
export interface EffectProperties {
  boxShadow?: string | null;
  opacity?: number | null;
  filter?: string | null;
  transform?: string | null;
}
```

## Responsive

```ts
export interface ResponsiveProperties {
  visibilityByViewport?: Record<string, boolean>;
  boundsByViewport?: Record<string, Bounds>;
  typographyByViewport?: Record<string, TypographyProperties>;
}
```

## Source metadata

```ts
export interface SourceElementMetadata {
  provider: DesignSourceType;
  sourceId?: string;
  sourcePath?: string;
  originalType?: string;
  classNames?: string[];
  attributes?: Record<string, string>;
  rawReference?: string;
}
```

`rawReference` should be an identifier or pointer, not a giant raw payload.

## Normalization rules

### Lengths

Convert these to CSS pixel numbers whenever possible:

- px,
- rem,
- em,
- percentages when a concrete containing size is known,
- Figma numeric dimensions,
- XD numeric dimensions.

Keep `unresolved` state when conversion requires unknown context.

### Colors

Normalize:

```text
#ffffff
rgb(255,255,255)
rgba(255,255,255,1)
```

into the same canonical value.

### Font weight

Normalize common names and numeric weights to a consistent scale.

### Line height

Where a browser reports `normal`, preserve a special normalized state rather than fabricating a numeric value.

## Versioning

`schemaVersion` is mandatory.

Changes that remove or reinterpret fields require a schema version increment and migration path.

## Implementation notes (schema 1.0.0)

The types above are implemented in `packages/design-spec/src/types.ts` with these refinements, made because the original shapes could not represent the normalization rules in this document:

- **Unresolved lengths.** `Length = number | null`. Spacing sides, gaps, radii, font size and letter spacing use it; `null` means the source could not provide or resolve the value, never 0.
- **Line height** is `number | 'normal'` (px), preserving the browser's `normal` state.
- **Font weight** is always numeric (100–900); names such as `bold` or Figma's `SemiBold` are normalized.
- **Shadows** are structured (`effects.shadows: ShadowValue[]`) instead of a raw `boxShadow` string, so they can be compared.
- **Pages** may carry `viewportId`, `width` and `height`; **visibility** may carry a `reason`; **source metadata** may carry a CSS `selector`.
- **Comparison contracts** (`ValidationIssue`, `ValidationReport`, `NormalizedValue`, tolerances) and **matcher contracts** (`ElementMatch`, `MatchResult`) live in `packages/design-spec` (`report.ts`, `matching.ts`). The comparator, AI layer, persistence and UI all consume them, so they must not live in any one of those packages.
- `NormalizedValue` keeps the value kind (`length`, `color`, `keyword`, ...); display strings such as `20px` and `+4px` are derived by `format.ts`, never stored as the source of truth.
- `migrateDesignSpec` upgrades `0.1.0` documents to `1.0.0`.
