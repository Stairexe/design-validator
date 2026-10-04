/**
 * The subset of the Adobe XD scenegraph API the exporter reads
 * (https://developer.adobe.com/xd/uxp/develop/reference/scenegraph/).
 * Declared structurally so conversion can be tested without XD.
 */
export interface XdColor {
  toHex(short?: boolean): string;
  /** 0–255 */
  a: number;
}

export interface XdBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface XdSceneNode {
  guid: string;
  name: string;
  /** Scenegraph class, e.g. `Rectangle`, `Text`, `Group`, `SymbolInstance`, `RepeatGrid`. */
  constructor: { name: string };
  visible: boolean;
  opacity: number;
  globalBounds: XdBounds;
  fill?: unknown;
  fillEnabled?: boolean;
  stroke?: XdColor | null;
  strokeEnabled?: boolean;
  strokeWidth?: number;
  strokeDashArray?: number[];
  cornerRadii?: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number };
  shadow?: { x: number; y: number; blur: number; color: XdColor; visible: boolean } | null;
  // Text
  text?: string;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  charSpacing?: number;
  lineSpacing?: number;
  textAlign?: string;
  textTransform?: string;
  underline?: boolean;
  strikethrough?: boolean;
  // Stacks & padding (XD 41+)
  layout?: {
    type?: string;
    stack?: { orientation?: string; spacings?: number | number[] };
    padding?: { values?: { top: number; right: number; bottom: number; left: number } };
  };
  // Components
  symbolId?: string;
  mainComponent?: { name?: string } | null;
  children?: { length: number; forEach(callback: (node: XdSceneNode) => void): void };
}
