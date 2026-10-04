/** Raw browser measurements returned by the in-page extraction script. */

export const CAPTURED_STYLE_PROPERTIES = [
  'display',
  'position',
  'visibility',
  'opacity',
  'flexDirection',
  'flexWrap',
  'alignItems',
  'justifyContent',
  'gridTemplateColumns',
  'gridTemplateRows',
  'overflow',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'rowGap',
  'columnGap',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textTransform',
  'textAlign',
  'textDecorationLine',
  'fontStyle',
  'color',
  'backgroundColor',
  'backgroundImage',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopStyle',
  'borderTopColor',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'boxShadow',
  'filter',
  'transform',
] as const;

export type CapturedStyleProperty = (typeof CAPTURED_STYLE_PROPERTIES)[number];

export interface RawElement {
  /** Sequential in document order: stable for an unchanged DOM. */
  index: number;
  parentIndex: number | null;
  tag: string;
  role: string | null;
  /** Own (direct) text, whitespace-collapsed. */
  text: string;
  classes: string[];
  attributes: Record<string, string>;
  selector: string;
  path: string;
  rect: { x: number; y: number; width: number; height: number };
  style: Record<CapturedStyleProperty, string>;
  /** True when an ancestor is display:none (subtree not descended). */
  hiddenByAncestor: boolean;
}

export interface RawExtraction {
  elements: RawElement[];
  truncated: boolean;
  document: { width: number; height: number; title: string; rootFontSize: number };
  stylesheets: string[];
}
