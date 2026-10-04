import {
  DESIGN_SPEC_SCHEMA_VERSION,
  normalizeFontWeight,
  roundPx,
  unitRgbaToColor,
  type Bounds,
  type ColorValue,
  type DesignElement,
  type DesignElementType,
  type DesignRole,
  type DesignSpec,
  type DesignToken,
  type DesignViewport,
  type ShadowValue,
  type TypographyProperties,
} from '@design-validator/design-spec';

import { FigmaError } from './errors';
import type { FigmaNode, FigmaNodesResponse, FigmaPaint, FigmaRect } from './figma-types';

const VECTOR_TYPES = new Set([
  'VECTOR',
  'BOOLEAN_OPERATION',
  'STAR',
  'POLYGON',
  'LINE',
  'ELLIPSE',
  'REGULAR_POLYGON',
]);
const CONTAINER_TYPES = new Set([
  'FRAME',
  'GROUP',
  'SECTION',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE',
]);
const MAX_NODES = 5_000;
const ICON_MAX_SIZE = 64;

export interface FigmaTarget {
  /** Target frame/node ID (`1:2`). */
  nodeId: string;
  /** Viewport this frame represents; defaults to the frame size. */
  viewport?: DesignViewport;
}

export interface FigmaNormalizeInput {
  fileKey: string;
  response: FigmaNodesResponse;
  targets: FigmaTarget[];
}

const solid = (paints: FigmaPaint[] | undefined): FigmaPaint | undefined =>
  // Figma paints are bottom-to-top; the last visible solid paint is on top.
  [...(paints ?? [])]
    .reverse()
    .find((paint) => paint.visible !== false && paint.type === 'SOLID' && paint.color);

function paintColor(paint: FigmaPaint | undefined): ColorValue | null {
  if (!paint?.color) return null;
  const { r, g, b, a } = paint.color;
  return unitRgbaToColor(r, g, b, a * (paint.opacity ?? 1));
}

const hasImageFill = (node: FigmaNode) =>
  (node.fills ?? []).some((paint) => paint.visible !== false && paint.type === 'IMAGE');

/** Small containers made only of vectors are icons; their vector parts are not compared individually. */
function isIconLike(node: FigmaNode): boolean {
  const box = node.absoluteBoundingBox;
  if (!box || box.width > ICON_MAX_SIZE || box.height > ICON_MAX_SIZE) return false;
  if (VECTOR_TYPES.has(node.type)) return true;
  if (!CONTAINER_TYPES.has(node.type) || !node.children?.length) return false;
  const vectorLeaves = (n: FigmaNode): boolean =>
    n.children?.length ? n.children.every(vectorLeaves) : VECTOR_TYPES.has(n.type);
  return node.children.every(vectorLeaves);
}

function elementType(node: FigmaNode, isRoot: boolean): DesignElementType {
  if (isRoot) return 'frame';
  if (node.type === 'TEXT') return 'text';
  if (isIconLike(node)) return 'icon';
  if (hasImageFill(node)) return 'image';
  if (/\b(button|btn|cta)\b/i.test(node.name) && node.type !== 'TEXT') return 'button';
  if (/\b(input|text ?field|textfield|search ?bar)\b/i.test(node.name)) return 'input';
  if (/\blink\b/i.test(node.name)) return 'link';
  if (node.type === 'INSTANCE') return 'instance';
  if (node.type === 'COMPONENT') return 'component';
  if (node.type === 'SECTION') return 'section';
  if (CONTAINER_TYPES.has(node.type)) return 'container';
  if (node.type === 'RECTANGLE' || VECTOR_TYPES.has(node.type)) return 'shape';
  return 'unknown';
}

function elementRole(
  node: FigmaNode,
  type: DesignElementType,
  componentName: string | undefined,
): DesignRole {
  const name = `${node.name} ${componentName ?? ''}`;
  if (type === 'button' || /\b(button|btn|cta)\b/i.test(name)) return 'button';
  if (type === 'image' || type === 'icon') return 'image';
  if (type === 'input') return 'input';
  if (type === 'link') return 'link';
  if (type === 'text') {
    if (
      /\b(h[1-6]|heading|title|headline|display)\b/i.test(name) ||
      (node.style?.fontSize ?? 0) >= 24
    )
      return 'heading';
    if (/\blabel\b/i.test(name)) return 'label';
    return 'paragraph';
  }
  if (/\b(nav|navbar|navigation|menu)\b/i.test(name)) return 'navigation';
  if (/\bcard\b/i.test(name)) return 'card';
  if (type === 'section' || type === 'frame') return 'section';
  return 'container';
}

function typography(node: FigmaNode): TypographyProperties | undefined {
  const style = node.style;
  if (node.type !== 'TEXT' || !style) return undefined;
  const fontSize = style.fontSize ?? null;
  const lineHeight =
    style.lineHeightUnit === 'INTRINSIC_%'
      ? 'normal'
      : style.lineHeightPx === undefined
        ? null
        : roundPx(style.lineHeightPx);
  const textCase: Record<string, string> = {
    UPPER: 'uppercase',
    LOWER: 'lowercase',
    TITLE: 'capitalize',
  };
  const align: Record<string, string> = {
    LEFT: 'left',
    RIGHT: 'right',
    CENTER: 'center',
    JUSTIFIED: 'justify',
  };
  const decoration: Record<string, string> = {
    UNDERLINE: 'underline',
    STRIKETHROUGH: 'line-through',
  };
  return {
    fontFamily: style.fontFamily ?? null,
    fontSize,
    fontWeight: normalizeFontWeight(style.fontWeight ?? null),
    lineHeight,
    letterSpacing: style.letterSpacing === undefined ? null : roundPx(style.letterSpacing),
    textTransform: textCase[style.textCase ?? ''] ?? 'none',
    // Auto-width text hugs its content, so its alignment has no visible effect.
    textAlign:
      style.textAutoResize === 'WIDTH_AND_HEIGHT'
        ? null
        : (align[style.textAlignHorizontal ?? 'LEFT'] ?? 'left'),
    textDecoration: decoration[style.textDecoration ?? ''] ?? 'none',
    fontStyle: style.italic ? 'italic' : 'normal',
    color: paintColor(solid(node.fills)),
  };
}

function shadows(node: FigmaNode): ShadowValue[] {
  return (node.effects ?? [])
    .filter(
      (effect) =>
        effect.visible !== false &&
        (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW'),
    )
    .map((effect) => ({
      x: effect.offset?.x ?? 0,
      y: effect.offset?.y ?? 0,
      blur: effect.radius ?? 0,
      spread: effect.spread ?? 0,
      color: effect.color
        ? unitRgbaToColor(effect.color.r, effect.color.g, effect.color.b, effect.color.a)
        : { hex: '#000000', alpha: 1 },
      inset: effect.type === 'INNER_SHADOW',
    }));
}

const ALIGN: Record<string, string> = {
  MIN: 'flex-start',
  CENTER: 'center',
  MAX: 'flex-end',
  SPACE_BETWEEN: 'space-between',
  BASELINE: 'baseline',
};

function toElement(
  node: FigmaNode,
  context: {
    origin: FigmaRect;
    isRoot: boolean;
    parentId: string | null;
    path: string;
    hidden: boolean;
    fileKey: string;
    components: Record<string, { name: string }>;
  },
): DesignElement {
  const box = node.absoluteBoundingBox ?? context.origin;
  const bounds: Bounds = {
    x: roundPx(box.x - context.origin.x),
    y: roundPx(box.y - context.origin.y),
    width: roundPx(box.width),
    height: roundPx(box.height),
  };
  const componentName = node.componentId ? context.components[node.componentId]?.name : undefined;
  const type = elementType(node, context.isRoot);
  const autoLayout = node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL';
  const horizontal = node.layoutMode === 'HORIZONTAL';
  const spaceBetween = node.primaryAxisAlignItems === 'SPACE_BETWEEN';
  const itemSpacing = autoLayout && !spaceBetween ? (node.itemSpacing ?? 0) : null;
  const counterSpacing =
    autoLayout && node.layoutWrap === 'WRAP' ? (node.counterAxisSpacing ?? 0) : null;
  const typo = typography(node);
  const stroke = solid(node.strokes);
  const strokeWidths = node.individualStrokeWeights ?? {
    top: node.strokeWeight ?? 0,
    right: node.strokeWeight ?? 0,
    bottom: node.strokeWeight ?? 0,
    left: node.strokeWeight ?? 0,
  };
  const radii =
    node.rectangleCornerRadii ??
    (node.cornerRadius === undefined
      ? undefined
      : [node.cornerRadius, node.cornerRadius, node.cornerRadius, node.cornerRadius]);
  const radiusDefault = CONTAINER_TYPES.has(node.type) || node.type === 'RECTANGLE' ? 0 : null;
  const fill = paintColor(solid(node.fills));
  const blur = (node.effects ?? []).find(
    (effect) => effect.visible !== false && effect.type === 'LAYER_BLUR',
  );

  return {
    id: node.id,
    name: node.name,
    type,
    role: elementRole(node, type, componentName),
    parentId: context.parentId,
    childIds: [],
    ...(node.type === 'TEXT' && node.characters
      ? { text: node.characters.replace(/\s+/g, ' ').trim() }
      : {}),
    bounds,
    visibility:
      context.hidden || node.visible === false
        ? { visible: false, reason: 'hidden-in-design' }
        : { visible: true },
    layout: autoLayout
      ? {
          display: 'flex',
          flexDirection: horizontal ? 'row' : 'column',
          alignItems: ALIGN[node.counterAxisAlignItems ?? 'MIN'] ?? 'flex-start',
          justifyContent: ALIGN[node.primaryAxisAlignItems ?? 'MIN'] ?? 'flex-start',
          flexWrap: node.layoutWrap === 'WRAP' ? 'wrap' : 'nowrap',
          overflow: node.clipsContent ? 'hidden' : 'visible',
        }
      : {},
    // Paddings and gaps are only explicit with auto layout; otherwise unknown (not 0).
    spacing: autoLayout
      ? {
          padding: {
            top: node.paddingTop ?? 0,
            right: node.paddingRight ?? 0,
            bottom: node.paddingBottom ?? 0,
            left: node.paddingLeft ?? 0,
          },
          gap: itemSpacing,
          rowGap: horizontal ? counterSpacing : itemSpacing,
          columnGap: horizontal ? itemSpacing : counterSpacing,
        }
      : {},
    ...(typo ? { typography: typo } : {}),
    colors:
      node.type === 'TEXT'
        ? { text: typo?.color ?? null }
        : VECTOR_TYPES.has(node.type) || type === 'icon'
          ? { fill }
          : { background: hasImageFill(node) ? null : fill },
    border: {
      width: stroke ? strokeWidths : { top: 0, right: 0, bottom: 0, left: 0 },
      style: stroke ? (node.strokeDashes?.length ? 'dashed' : 'solid') : 'none',
      color: paintColor(stroke),
    },
    radius: {
      topLeft: radii?.[0] ?? radiusDefault,
      topRight: radii?.[1] ?? radiusDefault,
      bottomRight: radii?.[2] ?? radiusDefault,
      bottomLeft: radii?.[3] ?? radiusDefault,
    },
    effects: {
      shadows: shadows(node),
      opacity: node.opacity ?? 1,
      filter: blur ? `blur(${blur.radius ?? 0}px)` : null,
    },
    source: {
      provider: 'figma',
      sourceId: node.id,
      sourcePath: context.path,
      originalType: node.type,
      rawReference: `figma://file/${context.fileKey}/node/${node.id}`,
      ...(componentName ? { attributes: { component: componentName } } : {}),
    },
  };
}

function flatten(
  root: FigmaNode,
  fileKey: string,
  components: Record<string, { name: string }>,
): DesignElement[] {
  const origin = root.absoluteBoundingBox;
  if (!origin) {
    throw new FigmaError(
      'FIGMA_NODE_NOT_FOUND',
      `Figma node ${root.id} has no geometry (is it a page instead of a frame?).`,
    );
  }
  const elements: DesignElement[] = [];
  const visit = (
    node: FigmaNode,
    parentId: string | null,
    path: string,
    hidden: boolean,
    isRoot: boolean,
  ) => {
    if (elements.length >= MAX_NODES) return;
    const ownPath = path ? `${path}/${node.name}` : node.name;
    const element = toElement(node, {
      origin,
      isRoot,
      parentId,
      path: ownPath,
      hidden,
      fileKey,
      components,
    });
    elements.push(element);
    if (element.type === 'icon' || element.type === 'image' || node.type === 'TEXT') return;
    for (const child of node.children ?? []) {
      visit(child, node.id, ownPath, hidden || node.visible === false, false);
    }
  };
  visit(root, null, '', false, true);

  const byId = new Map(elements.map((element) => [element.id, element]));
  for (const element of elements) {
    if (element.parentId) byId.get(element.parentId)?.childIds.push(element.id);
  }
  return elements;
}

function tokens(response: FigmaNodesResponse): DesignToken[] {
  const seen = new Map<string, DesignToken>();
  for (const entry of Object.values(response.nodes)) {
    for (const style of Object.values(entry?.styles ?? {})) {
      const type =
        style.styleType === 'FILL'
          ? 'color'
          : style.styleType === 'TEXT'
            ? 'typography'
            : style.styleType === 'EFFECT'
              ? 'shadow'
              : 'other';
      seen.set(style.key, { name: style.name, type, value: { key: style.key } });
    }
  }
  return [...seen.values()];
}

/**
 * Normalizes Figma node responses into one DesignSpec with a page per target
 * frame. Coordinates are relative to each target frame's origin.
 */
export function figmaToDesignSpec({ fileKey, response, targets }: FigmaNormalizeInput): DesignSpec {
  if (targets.length === 0) {
    throw new FigmaError('FIGMA_NODE_NOT_FOUND', 'At least one target frame is required.');
  }
  const viewports: DesignViewport[] = [];
  const pages = targets.map((target) => {
    const entry = response.nodes[target.nodeId];
    if (!entry) {
      throw new FigmaError(
        'FIGMA_NODE_NOT_FOUND',
        `Figma node ${target.nodeId} was not found in the response.`,
      );
    }
    const root = entry.document;
    const components = Object.fromEntries(
      Object.entries(entry.components ?? {}).map(([id, meta]) => [id, { name: meta.name }]),
    );
    const elements = flatten(root, fileKey, components);
    const box = root.absoluteBoundingBox ?? { width: 0, height: 0 };
    const viewport = target.viewport ?? {
      id: `frame-${root.id.replace(/[^A-Za-z0-9]/g, '-')}`,
      width: Math.round(box.width),
      height: Math.round(box.height),
      label: root.name,
    };
    if (!viewports.some((v) => v.id === viewport.id)) viewports.push(viewport);
    return {
      id: root.id,
      name: root.name,
      viewportId: viewport.id,
      width: roundPx(box.width),
      height: roundPx(box.height),
      rootIds: [root.id],
      elements,
    };
  });

  return {
    schemaVersion: DESIGN_SPEC_SCHEMA_VERSION,
    source: {
      type: 'figma',
      id: fileKey,
      name: response.name,
      uri: `https://www.figma.com/design/${fileKey}`,
      ...(response.version ? { version: response.version } : {}),
    },
    document: { id: fileKey, name: response.name },
    viewports,
    pages,
    tokens: tokens(response),
    metadata: { lastModified: response.lastModified ?? null },
  };
}

/** Targets used by the repository's pricing fixture (fixtures/figma). */
export const FIGMA_PRICING_TARGETS: FigmaTarget[] = [
  { nodeId: '1:2', viewport: { id: 'desktop', width: 1440, height: 900 } },
  { nodeId: '5:2', viewport: { id: 'mobile', width: 390, height: 844 } },
];
