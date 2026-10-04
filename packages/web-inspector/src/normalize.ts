import {
  DESIGN_SPEC_SCHEMA_VERSION,
  normalizeFontFamily,
  normalizeFontWeight,
  normalizeLineHeight,
  parseColor,
  roundPx,
  toPx,
  type BoxSpacing,
  type ColorValue,
  type DesignElement,
  type DesignElementType,
  type DesignRole,
  type DesignSpec,
  type DesignViewport,
  type ShadowValue,
  type TypographyProperties,
} from '@design-validator/design-spec';

import type { RawElement, RawExtraction } from './raw-types';

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const TEXT_TAGS = new Set([
  'p',
  'span',
  'label',
  'strong',
  'em',
  'b',
  'i',
  'small',
  'li',
  'blockquote',
  'figcaption',
  'dt',
  'dd',
  'td',
  'th',
  'code',
  'pre',
]);
const SECTION_TAGS = new Set([
  'section',
  'header',
  'footer',
  'main',
  'article',
  'aside',
  'nav',
  'form',
]);
const IMAGE_TAGS = new Set(['img', 'picture', 'video', 'canvas', 'figure']);

function elementType(raw: RawElement): DesignElementType {
  const role = raw.role;
  if (
    raw.tag === 'button' ||
    role === 'button' ||
    (raw.tag === 'input' && ['button', 'submit', 'reset'].includes(raw.attributes['type'] ?? ''))
  ) {
    return 'button';
  }
  if (raw.tag === 'a') return 'link';
  if (raw.tag === 'svg') return raw.rect.width <= 48 && raw.rect.height <= 48 ? 'icon' : 'image';
  if (IMAGE_TAGS.has(raw.tag)) return 'image';
  if (['input', 'textarea', 'select'].includes(raw.tag)) return 'input';
  if (raw.tag === 'ul' || raw.tag === 'ol') return 'list';
  if (HEADING_TAGS.has(raw.tag) || TEXT_TAGS.has(raw.tag)) return raw.text ? 'text' : 'container';
  if (SECTION_TAGS.has(raw.tag)) return 'section';
  return raw.text ? 'text' : 'container';
}

function elementRole(raw: RawElement, type: DesignElementType): DesignRole {
  const explicit = raw.role;
  if (explicit === 'heading' || HEADING_TAGS.has(raw.tag)) return 'heading';
  if (type === 'button') return 'button';
  if (explicit === 'navigation' || raw.tag === 'nav') return 'navigation';
  if (type === 'link') return 'link';
  if (type === 'image' || type === 'icon') return 'image';
  if (type === 'input') return 'input';
  if (raw.tag === 'label') return 'label';
  if (raw.tag === 'p') return 'paragraph';
  if (type === 'section') return 'section';
  if (type === 'text') return 'paragraph';
  return 'container';
}

function elementName(raw: RawElement): string {
  const label = raw.attributes['aria-label'] ?? raw.attributes['alt'];
  if (label) return label;
  const id = raw.attributes['id'];
  const base = id ? `${raw.tag}#${id}` : raw.classes[0] ? `${raw.tag}.${raw.classes[0]}` : raw.tag;
  return raw.text ? `${base} "${raw.text.slice(0, 40)}"` : base;
}

const px = (value: string) => toPx(value);

function box(style: RawElement['style'], prefix: 'margin' | 'padding'): BoxSpacing {
  return {
    top: px(style[`${prefix}Top`]),
    right: px(style[`${prefix}Right`]),
    bottom: px(style[`${prefix}Bottom`]),
    left: px(style[`${prefix}Left`]),
  };
}

/** Transparent backgrounds/borders are "no colour", matching designs with no fill. */
function visibleColor(value: string): ColorValue | null {
  const color = parseColor(value);
  return color && color.alpha > 0 ? color : null;
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Parses computed `box-shadow` (`rgba(0, 0, 0, 0.1) 0px 4px 12px 0px [inset]`). */
export function parseBoxShadow(value: string): ShadowValue[] | null {
  if (!value || value === 'none') return [];
  const shadows: ShadowValue[] = [];
  for (const part of splitTopLevel(value)) {
    const colorMatch = /(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i.exec(part);
    const color = parseColor(colorMatch?.[1] ?? 'black');
    const lengths = part
      .replace(colorMatch?.[1] ?? '', '')
      .replace('inset', '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => toPx(token));
    if (!color || lengths.length < 2 || lengths.some((length) => length === null)) {
      return null;
    }
    const [x = 0, y = 0, blur = 0, spread = 0] = lengths as number[];
    shadows.push({ x, y, blur, spread, color, inset: /\binset\b/.test(part) });
  }
  return shadows;
}

function typography(raw: RawElement, type: DesignElementType): TypographyProperties | undefined {
  if (!raw.text && type !== 'button' && type !== 'input') return undefined;
  const { style } = raw;
  const fontSize = px(style.fontSize);
  return {
    fontFamily: normalizeFontFamily(style.fontFamily),
    fontSize,
    fontWeight: normalizeFontWeight(style.fontWeight),
    lineHeight: normalizeLineHeight(style.lineHeight, fontSize),
    letterSpacing: style.letterSpacing === 'normal' ? 0 : px(style.letterSpacing),
    textTransform: style.textTransform,
    textAlign: style.textAlign === 'start' ? 'left' : style.textAlign,
    textDecoration: style.textDecorationLine,
    fontStyle: style.fontStyle,
    color: parseColor(style.color),
  };
}

function toElement(raw: RawElement, rootFontSize: number): DesignElement {
  const { style } = raw;
  const type = elementType(raw);
  const opacity = Number.parseFloat(style.opacity);
  const hidden =
    raw.hiddenByAncestor || style.display === 'none'
      ? 'display-none'
      : style.visibility === 'hidden' || style.visibility === 'collapse'
        ? 'visibility-hidden'
        : opacity === 0
          ? 'opacity-zero'
          : raw.rect.width === 0 || raw.rect.height === 0
            ? 'zero-size'
            : undefined;
  const borderStyle = style.borderTopStyle;
  const noBorder = borderStyle === 'none' || borderStyle === 'hidden';
  const borderWidth = (value: string) => (noBorder ? 0 : px(value));
  const gapOf = (value: string) => (value === 'normal' ? 0 : toPx(value, { rootFontSize }));
  const typo = typography(raw, type);
  const rowGap = gapOf(style.rowGap);
  const columnGap = gapOf(style.columnGap);
  // `gap` is the main-axis gap between items, matching design-tool item spacing.
  const isFlex = style.display === 'flex' || style.display === 'inline-flex';
  const isGrid = style.display === 'grid' || style.display === 'inline-grid';
  const mainAxisGap = isFlex
    ? style.flexDirection.startsWith('column')
      ? rowGap
      : columnGap
    : isGrid && rowGap === columnGap
      ? rowGap
      : undefined;
  const shadows = parseBoxShadow(style.boxShadow);

  return {
    id: `dom-${raw.index}`,
    name: elementName(raw),
    type,
    role: elementRole(raw, type),
    parentId: raw.parentIndex === null ? null : `dom-${raw.parentIndex}`,
    childIds: [],
    ...(raw.text ? { text: raw.text } : {}),
    bounds: {
      x: roundPx(raw.rect.x),
      y: roundPx(raw.rect.y),
      width: roundPx(raw.rect.width),
      height: roundPx(raw.rect.height),
    },
    visibility: hidden ? { visible: false, reason: hidden } : { visible: true },
    layout: {
      display: style.display,
      position: style.position,
      flexDirection: style.flexDirection,
      alignItems: style.alignItems,
      justifyContent: style.justifyContent,
      flexWrap: style.flexWrap,
      gridTemplateColumns: style.gridTemplateColumns,
      gridTemplateRows: style.gridTemplateRows,
      overflow: style.overflow,
    },
    spacing: {
      margin: box(style, 'margin'),
      padding: box(style, 'padding'),
      ...(mainAxisGap === undefined ? {} : { gap: mainAxisGap }),
      rowGap,
      columnGap,
    },
    ...(typo ? { typography: typo } : {}),
    colors: {
      text: typo ? (typo.color ?? null) : null,
      background: style.backgroundImage !== 'none' ? null : visibleColor(style.backgroundColor),
    },
    border: {
      width: {
        top: borderWidth(style.borderTopWidth),
        right: borderWidth(style.borderRightWidth),
        bottom: borderWidth(style.borderBottomWidth),
        left: borderWidth(style.borderLeftWidth),
      },
      style: noBorder ? 'none' : borderStyle,
      color: noBorder ? null : visibleColor(style.borderTopColor),
    },
    radius: {
      topLeft: px(style.borderTopLeftRadius),
      topRight: px(style.borderTopRightRadius),
      bottomRight: px(style.borderBottomRightRadius),
      bottomLeft: px(style.borderBottomLeftRadius),
    },
    effects: {
      shadows,
      opacity: Number.isFinite(opacity) ? opacity : null,
      filter: style.filter === 'none' ? null : style.filter,
      transform: style.transform === 'none' ? null : style.transform,
    },
    source: {
      provider: 'website',
      sourceId: `dom-${raw.index}`,
      sourcePath: raw.path,
      selector: raw.selector,
      originalType: raw.tag,
      classNames: raw.classes,
      attributes: raw.attributes,
    },
  };
}

export interface WebsiteSpecInput {
  url: string;
  viewport: DesignViewport;
  extraction: RawExtraction;
  metadata?: Record<string, unknown>;
}

/** Converts raw browser measurements for one viewport into a Website DesignSpec. */
export function toWebsiteDesignSpec({
  url,
  viewport,
  extraction,
  metadata = {},
}: WebsiteSpecInput): DesignSpec {
  const elements = extraction.elements.map((raw) =>
    toElement(raw, extraction.document.rootFontSize),
  );
  const children = new Map<string, string[]>();
  for (const element of elements) {
    if (element.parentId) {
      const list = children.get(element.parentId) ?? [];
      list.push(element.id);
      children.set(element.parentId, list);
    }
  }
  for (const element of elements) {
    element.childIds = children.get(element.id) ?? [];
  }

  return {
    schemaVersion: DESIGN_SPEC_SCHEMA_VERSION,
    source: { type: 'website', uri: url, name: extraction.document.title || url },
    document: {
      id: url,
      name: extraction.document.title || url,
      width: extraction.document.width,
      height: extraction.document.height,
    },
    viewports: [viewport],
    pages: [
      {
        id: `page-${viewport.id}`,
        name: `${url} @ ${viewport.width}×${viewport.height}`,
        viewportId: viewport.id,
        width: extraction.document.width,
        height: extraction.document.height,
        rootIds: elements.filter((element) => !element.parentId).map((element) => element.id),
        elements,
      },
    ],
    metadata: { truncated: extraction.truncated, stylesheets: extraction.stylesheets, ...metadata },
  };
}
