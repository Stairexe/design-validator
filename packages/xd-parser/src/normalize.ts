import {
  DESIGN_SPEC_SCHEMA_VERSION,
  normalizeFontWeight,
  parseColor,
  roundPx,
  type ColorValue,
  type DesignElement,
  type DesignElementType,
  type DesignRole,
  type DesignSpec,
  type DesignViewport,
} from '@design-validator/design-spec';

import type { XdArtboard, XdManifest, XdNode } from './manifest-schema';
import { XdManifestError } from './validate';

const SHAPE_TYPES = new Set(['Rectangle', 'Ellipse', 'Polygon', 'Line', 'Path', 'BooleanGroup']);
const CONTAINER_TYPES = new Set([
  'Group',
  'SymbolInstance',
  'RepeatGrid',
  'ScrollableGroup',
  'Artboard',
]);

const withAlpha = (hex: string, alpha: number): ColorValue | null => {
  const color = parseColor(hex);
  return color ? { ...color, alpha: Math.round(alpha * 1000) / 1000 } : null;
};

function elementType(node: XdNode): DesignElementType {
  if (node.type === 'Text') return 'text';
  if (node.fill?.type === 'image') return 'image';
  const name = `${node.name} ${node.symbolName ?? ''}`;
  if (/\b(button|btn|cta)\b/i.test(name)) return 'button';
  if (/\b(input|text ?field|search)\b/i.test(name)) return 'input';
  if (/\blink\b/i.test(name)) return 'link';
  if (/\bicon\b/i.test(name) && node.bounds.width <= 64 && node.bounds.height <= 64) return 'icon';
  if (node.type === 'SymbolInstance') return 'instance';
  if (CONTAINER_TYPES.has(node.type)) return 'container';
  if (SHAPE_TYPES.has(node.type)) return 'shape';
  return 'unknown';
}

function elementRole(node: XdNode, type: DesignElementType): DesignRole {
  const name = `${node.name} ${node.symbolName ?? ''}`;
  if (type === 'button') return 'button';
  if (type === 'image' || type === 'icon') return 'image';
  if (type === 'input') return 'input';
  if (type === 'link') return 'link';
  if (type === 'text') {
    if (/\b(h[1-6]|heading|title|headline)\b/i.test(name) || (node.text?.fontSize ?? 0) >= 24)
      return 'heading';
    if (/\blabel\b/i.test(name)) return 'label';
    return 'paragraph';
  }
  if (/\b(nav|navbar|menu)\b/i.test(name)) return 'navigation';
  if (/\bcard\b/i.test(name)) return 'card';
  return 'container';
}

const TRANSFORM: Record<string, string> = {
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  titlecase: 'capitalize',
  none: 'none',
};

function toElement(node: XdNode, parentId: string, path: string, hidden: boolean): DesignElement {
  const type = elementType(node);
  const fill = node.fill?.type === 'color' ? withAlpha(node.fill.color, node.fill.alpha) : null;
  const stroke = node.stroke?.enabled && node.stroke.width > 0 ? node.stroke : undefined;
  const text = node.text;
  const textColor = text ? withAlpha(text.color, text.alpha) : null;
  const stack = node.layout?.type === 'stack' ? node.layout : undefined;
  const radiusDefault = CONTAINER_TYPES.has(node.type) || node.type === 'Rectangle' ? 0 : null;

  return {
    id: node.guid,
    name: node.name,
    type,
    role: elementRole(node, type),
    parentId,
    childIds: [],
    ...(text ? { text: text.content.replace(/\s+/g, ' ').trim() } : {}),
    bounds: {
      x: roundPx(node.bounds.x),
      y: roundPx(node.bounds.y),
      width: roundPx(node.bounds.width),
      height: roundPx(node.bounds.height),
    },
    visibility:
      hidden || !node.visible ? { visible: false, reason: 'hidden-in-design' } : { visible: true },
    layout: stack
      ? {
          display: 'flex',
          flexDirection: stack.orientation === 'horizontal' ? 'row' : 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
        }
      : {},
    spacing: stack
      ? {
          padding: stack.padding,
          gap: stack.spacing,
          ...(stack.orientation === 'horizontal'
            ? { columnGap: stack.spacing }
            : { rowGap: stack.spacing }),
        }
      : {},
    ...(text
      ? {
          typography: {
            fontFamily: text.fontFamily,
            fontSize: text.fontSize,
            fontWeight: normalizeFontWeight(text.fontStyle),
            lineHeight: text.lineSpacing === 0 ? 'normal' : roundPx(text.lineSpacing),
            letterSpacing: roundPx((text.charSpacing / 1000) * text.fontSize),
            textTransform: TRANSFORM[text.textTransform] ?? 'none',
            textAlign: text.textAlign,
            textDecoration: text.underline
              ? 'underline'
              : text.strikethrough
                ? 'line-through'
                : 'none',
            fontStyle: /italic|oblique/i.test(text.fontStyle) ? 'italic' : 'normal',
            color: textColor,
          },
        }
      : {}),
    colors: text
      ? { text: textColor }
      : SHAPE_TYPES.has(node.type) && node.type !== 'Rectangle'
        ? { fill }
        : { background: fill },
    border: {
      width: stroke
        ? { top: stroke.width, right: stroke.width, bottom: stroke.width, left: stroke.width }
        : { top: 0, right: 0, bottom: 0, left: 0 },
      style: stroke ? (stroke.dashed ? 'dashed' : 'solid') : 'none',
      color: stroke ? withAlpha(stroke.color, stroke.alpha) : null,
    },
    radius: {
      topLeft: node.cornerRadii?.topLeft ?? radiusDefault,
      topRight: node.cornerRadii?.topRight ?? radiusDefault,
      bottomRight: node.cornerRadii?.bottomRight ?? radiusDefault,
      bottomLeft: node.cornerRadii?.bottomLeft ?? radiusDefault,
    },
    effects: {
      shadows:
        node.shadow?.visible === true
          ? [
              {
                x: node.shadow.x,
                y: node.shadow.y,
                blur: node.shadow.blur,
                spread: 0,
                color: withAlpha(node.shadow.color, node.shadow.alpha) ?? {
                  hex: '#000000',
                  alpha: 1,
                },
                inset: false,
              },
            ]
          : [],
      opacity: node.opacity,
    },
    source: {
      provider: 'adobe-xd',
      sourceId: node.guid,
      sourcePath: path,
      originalType: node.type,
      rawReference: `xd://node/${node.guid}`,
      ...(node.symbolName ? { attributes: { component: node.symbolName } } : {}),
    },
  };
}

function artboardElements(artboard: XdArtboard): DesignElement[] {
  const root: DesignElement = {
    ...toElement(
      {
        guid: artboard.guid,
        name: artboard.name,
        type: 'Artboard',
        visible: true,
        opacity: 1,
        bounds: { x: 0, y: 0, width: artboard.width, height: artboard.height },
        ...(artboard.fill ? { fill: artboard.fill } : {}),
      },
      '',
      artboard.name,
      false,
    ),
    type: 'frame',
    role: 'section',
    parentId: null,
  };
  const elements: DesignElement[] = [root];
  const visit = (node: XdNode, parentId: string, path: string, hidden: boolean) => {
    const ownPath = `${path}/${node.name}`;
    const element = toElement(node, parentId, ownPath, hidden);
    elements.push(element);
    if (element.type === 'image' || element.type === 'icon' || node.type === 'Text') return;
    for (const child of node.children ?? [])
      visit(child, node.guid, ownPath, hidden || !node.visible);
  };
  for (const node of artboard.children) visit(node, artboard.guid, artboard.name, false);
  const byId = new Map(elements.map((element) => [element.id, element]));
  for (const element of elements)
    if (element.parentId) byId.get(element.parentId)?.childIds.push(element.id);
  return elements;
}

export interface XdTarget {
  artboardGuid: string;
  viewport?: DesignViewport;
}

/** Normalizes selected artboards of a validated manifest into one DesignSpec. */
export function xdManifestToDesignSpec(manifest: XdManifest, targets: XdTarget[]): DesignSpec {
  const viewports: DesignViewport[] = [];
  const pages = targets.map((target) => {
    const artboard = manifest.artboards.find((candidate) => candidate.guid === target.artboardGuid);
    if (!artboard)
      throw new XdManifestError([`artboard ${target.artboardGuid} is not in the manifest`]);
    const viewport = target.viewport ?? {
      id: `artboard-${artboard.guid}`,
      width: artboard.width,
      height: artboard.height,
      label: artboard.name,
    };
    if (!viewports.some((existing) => existing.id === viewport.id)) viewports.push(viewport);
    return {
      id: artboard.guid,
      name: artboard.name,
      viewportId: viewport.id,
      width: artboard.width,
      height: artboard.height,
      rootIds: [artboard.guid],
      elements: artboardElements(artboard),
    };
  });
  return {
    schemaVersion: DESIGN_SPEC_SCHEMA_VERSION,
    source: {
      type: 'adobe-xd',
      name: manifest.document.name,
      ...(manifest.document.guid ? { id: manifest.document.guid } : {}),
      version: manifest.manifestVersion,
    },
    document: {
      id: manifest.document.guid ?? manifest.document.name,
      name: manifest.document.name,
    },
    viewports,
    pages,
    metadata: { generator: manifest.generator, exportedAt: manifest.exportedAt ?? null },
  };
}
