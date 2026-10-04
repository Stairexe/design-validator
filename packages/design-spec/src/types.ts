/**
 * Canonical, source-independent design representation (design-spec.md).
 *
 * This is the contract between source adapters (website, Figma, Adobe XD)
 * and the matcher/comparator, so it never references browser DOM objects or
 * design-tool API shapes.
 *
 * All lengths are CSS pixels after normalization. A `null` length means the
 * source could not provide or resolve the value (for example a percentage
 * without a known containing size); it is never fabricated as 0.
 */

/** CSS pixels, or `null` when unavailable/unresolved. */
export type Length = number | null;

export interface DesignSpec {
  schemaVersion: string;
  source: DesignSource;
  document: DesignDocument;
  viewports: DesignViewport[];
  pages: DesignPage[];
  tokens?: DesignToken[];
  metadata: Record<string, unknown>;
}

export type DesignSourceType = 'website' | 'figma' | 'adobe-xd';

export interface DesignSource {
  type: DesignSourceType;
  id?: string;
  name?: string;
  uri?: string;
  version?: string;
}

export interface DesignDocument {
  id: string;
  name: string;
  width?: number;
  height?: number;
}

export interface DesignViewport {
  id: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
  label?: string;
}

/**
 * One page/frame. For a website this is one rendered viewport of the URL;
 * for Figma/XD it is the target frame/artboard. `viewportId` links it to
 * `DesignSpec.viewports` when the page represents a specific viewport.
 */
export interface DesignPage {
  id: string;
  name: string;
  viewportId?: string;
  width?: number;
  height?: number;
  rootIds: string[];
  elements: DesignElement[];
}

export type DesignTokenType = 'color' | 'dimension' | 'typography' | 'shadow' | 'other';

export interface DesignToken {
  name: string;
  type: DesignTokenType;
  value: unknown;
}

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

export const DESIGN_ELEMENT_TYPES = [
  'page',
  'frame',
  'section',
  'container',
  'component',
  'instance',
  'text',
  'button',
  'image',
  'shape',
  'icon',
  'input',
  'link',
  'list',
  'unknown',
] as const;

export type DesignElementType = (typeof DESIGN_ELEMENT_TYPES)[number];

export const DESIGN_ROLES = [
  'heading',
  'paragraph',
  'button',
  'navigation',
  'card',
  'image',
  'input',
  'label',
  'link',
  'section',
  'container',
  'unknown',
] as const;

export type DesignRole = (typeof DESIGN_ROLES)[number];

export type HiddenReason =
  | 'display-none'
  | 'visibility-hidden'
  | 'opacity-zero'
  | 'zero-size'
  | 'hidden-in-design';

export interface Visibility {
  visible: boolean;
  reason?: HiddenReason;
}

/** Absolute position relative to the page/frame origin, in CSS pixels. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpacingProperties {
  margin?: BoxSpacing;
  padding?: BoxSpacing;
  gap?: Length;
  rowGap?: Length;
  columnGap?: Length;
}

export interface BoxSpacing {
  top: Length;
  right: Length;
  bottom: Length;
  left: Length;
}

/** Line height in px, or `'normal'` when the source reports the font default. */
export type LineHeight = number | 'normal';

export interface TypographyProperties {
  /** Primary family as authored (quotes stripped). Compare case-insensitively. */
  fontFamily?: string | null;
  fontSize?: Length;
  /** Numeric weight on the 100–900 scale. */
  fontWeight?: number | null;
  lineHeight?: LineHeight | null;
  letterSpacing?: Length;
  textTransform?: string | null;
  textAlign?: string | null;
  textDecoration?: string | null;
  fontStyle?: string | null;
  color?: ColorValue | null;
}

/** Canonical colour: lowercase `#rrggbb` plus alpha in [0, 1]. */
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

export interface BorderProperties {
  width: BoxSpacing;
  style?: string | null;
  color?: ColorValue | null;
}

export interface RadiusProperties {
  topLeft?: Length;
  topRight?: Length;
  bottomRight?: Length;
  bottomLeft?: Length;
}

export interface ShadowValue {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: ColorValue;
  inset: boolean;
}

export interface EffectProperties {
  shadows?: ShadowValue[] | null;
  opacity?: number | null;
  filter?: string | null;
  transform?: string | null;
}

export interface ResponsiveProperties {
  visibilityByViewport?: Record<string, boolean>;
  boundsByViewport?: Record<string, Bounds>;
  typographyByViewport?: Record<string, TypographyProperties>;
}

export interface SourceElementMetadata {
  provider: DesignSourceType;
  sourceId?: string;
  /** Hierarchical path, e.g. a DOM path or Figma layer path. */
  sourcePath?: string;
  /** Unique CSS selector for website elements. */
  selector?: string;
  originalType?: string;
  classNames?: string[];
  attributes?: Record<string, string>;
  /** An identifier or pointer — never a large raw payload. */
  rawReference?: string;
}
