/**
 * Canonical, source-independent design representation.
 *
 * This file mirrors `design-spec.md`. It is the contract between source
 * adapters (website, Figma, Adobe XD) and the matcher/comparator, so it must
 * never reference browser DOM objects or design-tool API shapes.
 *
 * All distances are CSS pixels after normalization.
 */

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

export interface DesignPage {
  id: string;
  name: string;
  rootIds: string[];
  elements: DesignElement[];
}

/**
 * Named design value (colour, spacing, type scale, ...). Referenced by
 * `design-spec.md` but not yet specified there; the shape is finalised in the
 * DesignSpec phase.
 */
export interface DesignToken {
  name: string;
  type: string;
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

/**
 * Referenced by `design-spec.md` but not yet specified there; the shape is
 * finalised in the DesignSpec phase.
 */
export interface Visibility {
  visible: boolean;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  topLeft?: number | null;
  topRight?: number | null;
  bottomRight?: number | null;
  bottomLeft?: number | null;
}

export interface EffectProperties {
  boxShadow?: string | null;
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
  sourcePath?: string;
  originalType?: string;
  classNames?: string[];
  attributes?: Record<string, string>;
  /** An identifier or pointer — never a large raw payload. */
  rawReference?: string;
}
