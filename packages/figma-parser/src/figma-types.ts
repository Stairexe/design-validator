/**
 * Subset of the Figma REST API node model used by the importer.
 * https://www.figma.com/developers/api#node-types
 * These shapes never leave this package.
 */

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaPaint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  imageRef?: string;
}

export interface FigmaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaEffect {
  /** DROP_SHADOW, INNER_SHADOW, LAYER_BLUR, BACKGROUND_BLUR, ... */
  type: string;
  visible?: boolean;
  radius?: number;
  spread?: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
}

export interface FigmaTypeStyle {
  fontFamily?: string;
  fontPostScriptName?: string | null;
  fontWeight?: number;
  fontSize?: number;
  italic?: boolean;
  textAlignHorizontal?: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  lineHeightPercentFontSize?: number;
  lineHeightUnit?: 'PIXELS' | 'FONT_SIZE_%' | 'INTRINSIC_%';
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  textAutoResize?: 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT' | 'TRUNCATE';
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: FigmaRect | null;
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  individualStrokeWeights?: { top: number; right: number; bottom: number; left: number };
  strokeDashes?: number[];
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  effects?: FigmaEffect[];
  opacity?: number;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  itemSpacing?: number;
  counterAxisSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  clipsContent?: boolean;
  characters?: string;
  style?: FigmaTypeStyle;
  componentId?: string;
  styles?: Record<string, string>;
}

export interface FigmaStyleMeta {
  key: string;
  name: string;
  /** FILL, TEXT, EFFECT, GRID, ... */
  styleType: string;
}

export interface FigmaComponentMeta {
  key: string;
  name: string;
}

/** Response of `GET /v1/files/:key/nodes?ids=...`. */
export interface FigmaNodesResponse {
  name: string;
  lastModified?: string;
  version?: string;
  nodes: Record<
    string,
    {
      document: FigmaNode;
      components?: Record<string, FigmaComponentMeta>;
      styles?: Record<string, FigmaStyleMeta>;
    } | null
  >;
}

/** Response of `GET /v1/files/:key?depth=2`. */
export interface FigmaFileResponse {
  name: string;
  lastModified?: string;
  version?: string;
  document: FigmaNode;
}

/** Response of `GET /v1/images/:key`. */
export interface FigmaImagesResponse {
  err: string | null;
  images: Record<string, string | null>;
}
