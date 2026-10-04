import {
  cssValue,
  type ColorValue,
  type DesignElement,
  type DesignPage,
} from '@design-validator/design-spec';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );

const color = (value: ColorValue | null | undefined) =>
  value ? cssValue({ kind: 'color', value }) : undefined;
const px = (value: number | null | undefined) => (value == null ? undefined : `${value}px`);

function styleFor(element: DesignElement, scale: number): string {
  const { bounds, typography, radius, border, effects, colors } = element;
  const declarations: Record<string, string | undefined> = {
    position: 'absolute',
    left: px(bounds.x * scale),
    top: px(bounds.y * scale),
    width: px(bounds.width * scale),
    height: px(bounds.height * scale),
    'box-sizing': 'border-box',
    background: color(colors.background ?? colors.fill),
    'border-top-left-radius': px(radius.topLeft),
    'border-top-right-radius': px(radius.topRight),
    'border-bottom-right-radius': px(radius.bottomRight),
    'border-bottom-left-radius': px(radius.bottomLeft),
    opacity: effects.opacity == null || effects.opacity === 1 ? undefined : String(effects.opacity),
    'box-shadow': effects.shadows?.length
      ? cssValue({ kind: 'shadow', value: effects.shadows })
      : undefined,
  };
  if (border.style && border.style !== 'none') {
    declarations['border-style'] = border.style;
    declarations['border-color'] = color(border.color);
    declarations['border-width'] = [
      border.width.top,
      border.width.right,
      border.width.bottom,
      border.width.left,
    ]
      .map((v) => `${v ?? 0}px`)
      .join(' ');
  }
  if (typography) {
    Object.assign(declarations, {
      'font-family': typography.fontFamily ? `"${typography.fontFamily}", sans-serif` : undefined,
      'font-size': px(typography.fontSize),
      'font-weight': typography.fontWeight == null ? undefined : String(typography.fontWeight),
      'line-height':
        typeof typography.lineHeight === 'number'
          ? px(typography.lineHeight)
          : (typography.lineHeight ?? undefined),
      'letter-spacing': px(typography.letterSpacing),
      'text-transform': typography.textTransform ?? undefined,
      'text-align': typography.textAlign ?? undefined,
      'font-style': typography.fontStyle ?? undefined,
      'text-decoration-line': typography.textDecoration ?? undefined,
      color: color(typography.color ?? colors.text),
      'white-space': 'pre-wrap',
      overflow: 'visible',
    });
  }
  if (element.type === 'image') {
    declarations['background'] ??=
      'repeating-linear-gradient(45deg,#e4e4e7 0 8px,#f4f4f5 8px 16px)';
  }
  return Object.entries(declarations)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([property, value]) => `${property}:${escapeHtml(value)}`)
    .join(';');
}

/**
 * Renders a design page as absolutely positioned boxes and text. An
 * approximation for visual comparison only (no vectors, gradients or images).
 */
export function renderDesignHtml(
  page: DesignPage,
  options: { width: number; scale?: number },
): string {
  const scale = options.scale ?? 1;
  const visible = page.elements.filter((element) => element.visibility.visible);
  const body = visible
    .map(
      (element) =>
        `<div data-id="${escapeHtml(element.id)}" style="${styleFor(element, scale)}">${element.text ? escapeHtml(element.text) : ''}</div>`,
    )
    .join('\n');
  const height = Math.ceil(
    (page.height ?? Math.max(...visible.map((e) => e.bounds.y + e.bounds.height), 1)) * scale,
  );
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#ffffff}body{position:relative;width:${options.width}px;height:${height}px;overflow:hidden}</style></head><body>${body}</body></html>`;
}
