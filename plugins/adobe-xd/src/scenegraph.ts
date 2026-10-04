import type { XdManifest, XdNode } from '@design-validator/xd-parser';

import type { XdColor, XdSceneNode } from './scene-types';

export const GENERATOR = { name: 'design-validator-xd-plugin', version: '0.1.0' };
export const MANIFEST_VERSION = '1.0' as const;

const MAX_NODES = 5_000;

const isColor = (value: unknown): value is XdColor =>
  typeof value === 'object' && value !== null && typeof (value as XdColor).toHex === 'function';

function hex(color: XdColor): string {
  const value = color.toHex(false);
  return (value.startsWith('#') ? value : `#${value}`).slice(0, 7).toLowerCase();
}

const alpha = (color: XdColor) => Math.round((color.a / 255) * 1000) / 1000;

function fillOf(node: XdSceneNode): XdNode['fill'] {
  if (node.fillEnabled === false || !node.fill) return undefined;
  if (isColor(node.fill)) return { type: 'color', color: hex(node.fill), alpha: alpha(node.fill) };
  const kind = (node.fill as { constructor?: { name?: string } }).constructor?.name ?? '';
  if (kind === 'ImageFill') return { type: 'image' };
  if (/Gradient/.test(kind)) return { type: 'gradient' };
  return undefined;
}

const children = (node: XdSceneNode): XdSceneNode[] => {
  const list: XdSceneNode[] = [];
  node.children?.forEach((child) => list.push(child));
  return list;
};

/** Converts one scenegraph node (and its subtree) to manifest form, artboard-relative. */
export function convertNode(
  node: XdSceneNode,
  origin: { x: number; y: number },
  budget: { remaining: number },
): XdNode | null {
  if (budget.remaining <= 0) return null;
  budget.remaining--;
  const type = node.constructor.name;
  const bounds = node.globalBounds;
  const converted: XdNode = {
    guid: node.guid,
    name: node.name,
    type,
    visible: node.visible,
    opacity: node.opacity,
    bounds: {
      x: bounds.x - origin.x,
      y: bounds.y - origin.y,
      width: bounds.width,
      height: bounds.height,
    },
  };
  const fill = fillOf(node);
  if (fill && type !== 'Text') converted.fill = fill;
  if (node.strokeEnabled && node.stroke && isColor(node.stroke) && (node.strokeWidth ?? 0) > 0) {
    converted.stroke = {
      color: hex(node.stroke),
      alpha: alpha(node.stroke),
      width: node.strokeWidth ?? 0,
      enabled: true,
      dashed: (node.strokeDashArray?.length ?? 0) > 0,
    };
  }
  if (node.cornerRadii) converted.cornerRadii = { ...node.cornerRadii };
  if (node.shadow && isColor(node.shadow.color)) {
    converted.shadow = {
      x: node.shadow.x,
      y: node.shadow.y,
      blur: node.shadow.blur,
      color: hex(node.shadow.color),
      alpha: alpha(node.shadow.color),
      visible: node.shadow.visible,
    };
  }
  if (type === 'Text' && typeof node.text === 'string') {
    const color = isColor(node.fill) ? node.fill : undefined;
    const transform = node.textTransform ?? 'none';
    converted.text = {
      content: node.text,
      fontFamily: node.fontFamily ?? 'unknown',
      fontStyle: node.fontStyle ?? 'Regular',
      fontSize: node.fontSize ?? 16,
      charSpacing: node.charSpacing ?? 0,
      lineSpacing: node.lineSpacing ?? 0,
      textAlign: (['left', 'center', 'right', 'justify'].includes(node.textAlign ?? '')
        ? node.textAlign
        : 'left') as 'left',
      textTransform: (['none', 'uppercase', 'lowercase', 'titlecase'].includes(transform)
        ? transform
        : 'none') as 'none',
      underline: node.underline ?? false,
      strikethrough: node.strikethrough ?? false,
      color: color ? hex(color) : '#000000',
      alpha: color ? alpha(color) : 1,
    };
  }
  if (node.layout?.type === 'stack' && node.layout.stack) {
    const spacings = node.layout.stack.spacings;
    converted.layout = {
      type: 'stack',
      orientation: node.layout.stack.orientation === 'horizontal' ? 'horizontal' : 'vertical',
      spacing: Array.isArray(spacings) ? (spacings[0] ?? 0) : (spacings ?? 0),
      padding: node.layout.padding?.values ?? { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }
  if (type === 'SymbolInstance' && node.mainComponent?.name)
    converted.symbolName = node.mainComponent.name;
  if (type !== 'Text') {
    const kids = children(node)
      .map((child) => convertNode(child, origin, budget))
      .filter((child): child is XdNode => child !== null);
    if (kids.length > 0) converted.children = kids;
  }
  return converted;
}

/** Builds a Design Validator manifest for the given artboards. */
export function buildManifest(
  documentName: string,
  artboards: XdSceneNode[],
  exportedAt = new Date().toISOString(),
): XdManifest {
  const budget = { remaining: MAX_NODES };
  return {
    manifestVersion: MANIFEST_VERSION,
    generator: GENERATOR,
    document: { name: documentName },
    exportedAt,
    artboards: artboards.map((artboard) => {
      const origin = { x: artboard.globalBounds.x, y: artboard.globalBounds.y };
      const fill = fillOf(artboard);
      return {
        guid: artboard.guid,
        name: artboard.name,
        width: artboard.globalBounds.width,
        height: artboard.globalBounds.height,
        ...(fill ? { fill } : {}),
        children: children(artboard)
          .map((child) => convertNode(child, origin, budget))
          .filter((child): child is XdNode => child !== null),
      };
    }),
  };
}
