import { formatColor } from './colors';
import type { IssueDelta, NormalizedValue } from './report';
import type { ShadowValue } from './types';

const trimNumber = (value: number) => String(Math.round(value * 100) / 100);

function formatShadow(shadow: ShadowValue): string {
  const parts = [shadow.x, shadow.y, shadow.blur, shadow.spread].map((v) => `${trimNumber(v)}px`);
  return `${shadow.inset ? 'inset ' : ''}${parts.join(' ')} ${formatColor(shadow.color)}`;
}

/** Display string for a measured value, e.g. `20px`, `#111111`, `Inter`. */
export function formatValue(value: NormalizedValue): string {
  switch (value.kind) {
    case 'length':
      return `${trimNumber(value.value)}px`;
    case 'number':
    case 'count':
      return trimNumber(value.value);
    case 'color':
      return formatColor(value.value);
    case 'keyword':
      return value.value;
    case 'shadow':
      return value.value.length === 0 ? 'none' : value.value.map(formatShadow).join(', ');
    case 'none':
      return 'none';
  }
}

/** Signed change to apply, e.g. `+4px`, `-2`, `ΔE 3.1`. */
export function formatDelta(delta: IssueDelta): string {
  if (delta.kind === 'color-distance') {
    return `ΔE ${trimNumber(delta.value)}`;
  }
  const sign = delta.value > 0 ? '+' : delta.value < 0 ? '-' : '';
  const magnitude = trimNumber(Math.abs(delta.value));
  return `${sign}${magnitude}${delta.kind === 'length' ? 'px' : ''}`;
}

interface PropertyInfo {
  label: string;
  /** CSS property for recommendations; absent when there is no direct CSS equivalent. */
  css?: string;
}

const PROPERTIES: Readonly<Record<string, PropertyInfo>> = {
  'bounds.x': { label: 'X position' },
  'bounds.y': { label: 'Y position' },
  'bounds.width': { label: 'Width', css: 'width' },
  'bounds.height': { label: 'Height', css: 'height' },
  'padding.top': { label: 'Padding top', css: 'padding-top' },
  'padding.right': { label: 'Padding right', css: 'padding-right' },
  'padding.bottom': { label: 'Padding bottom', css: 'padding-bottom' },
  'padding.left': { label: 'Padding left', css: 'padding-left' },
  'padding.inline': { label: 'Padding X', css: 'padding-inline' },
  'padding.block': { label: 'Padding Y', css: 'padding-block' },
  padding: { label: 'Padding', css: 'padding' },
  'margin.top': { label: 'Margin top', css: 'margin-top' },
  'margin.right': { label: 'Margin right', css: 'margin-right' },
  'margin.bottom': { label: 'Margin bottom', css: 'margin-bottom' },
  'margin.left': { label: 'Margin left', css: 'margin-left' },
  'margin.inline': { label: 'Margin X', css: 'margin-inline' },
  'margin.block': { label: 'Margin Y', css: 'margin-block' },
  margin: { label: 'Margin', css: 'margin' },
  gap: { label: 'Gap', css: 'gap' },
  rowGap: { label: 'Row gap', css: 'row-gap' },
  columnGap: { label: 'Column gap', css: 'column-gap' },
  'typography.fontFamily': { label: 'Font family', css: 'font-family' },
  'typography.fontSize': { label: 'Font size', css: 'font-size' },
  'typography.fontWeight': { label: 'Font weight', css: 'font-weight' },
  'typography.lineHeight': { label: 'Line height', css: 'line-height' },
  'typography.letterSpacing': { label: 'Letter spacing', css: 'letter-spacing' },
  'typography.textTransform': { label: 'Text transform', css: 'text-transform' },
  'typography.textAlign': { label: 'Text align', css: 'text-align' },
  'typography.textDecoration': { label: 'Text decoration', css: 'text-decoration-line' },
  'typography.fontStyle': { label: 'Font style', css: 'font-style' },
  'color.text': { label: 'Text color', css: 'color' },
  'color.background': { label: 'Background', css: 'background-color' },
  'color.fill': { label: 'Fill', css: 'fill' },
  'border.width.top': { label: 'Border top width', css: 'border-top-width' },
  'border.width.right': { label: 'Border right width', css: 'border-right-width' },
  'border.width.bottom': { label: 'Border bottom width', css: 'border-bottom-width' },
  'border.width.left': { label: 'Border left width', css: 'border-left-width' },
  'border.width': { label: 'Border width', css: 'border-width' },
  'border.style': { label: 'Border style', css: 'border-style' },
  'border.color': { label: 'Border color', css: 'border-color' },
  'radius.topLeft': { label: 'Radius top-left', css: 'border-top-left-radius' },
  'radius.topRight': { label: 'Radius top-right', css: 'border-top-right-radius' },
  'radius.bottomRight': { label: 'Radius bottom-right', css: 'border-bottom-right-radius' },
  'radius.bottomLeft': { label: 'Radius bottom-left', css: 'border-bottom-left-radius' },
  radius: { label: 'Radius', css: 'border-radius' },
  'effects.opacity': { label: 'Opacity', css: 'opacity' },
  'effects.shadows': { label: 'Shadow', css: 'box-shadow' },
  'layout.flexDirection': { label: 'Direction', css: 'flex-direction' },
  'layout.alignItems': { label: 'Align items', css: 'align-items' },
  'layout.justifyContent': { label: 'Justify content', css: 'justify-content' },
  visibility: { label: 'Visibility' },
  'structure.presence': { label: 'Presence' },
  'structure.count': { label: 'Repeated count' },
};

export function propertyLabel(property: string): string {
  return PROPERTIES[property]?.label ?? property;
}

export function cssPropertyFor(property: string): string | undefined {
  return PROPERTIES[property]?.css;
}

/** CSS declaration value for a required value, e.g. `24px`, `#000000`, `rgba(0, 0, 0, 0.5)`. */
export function cssValue(value: NormalizedValue): string | undefined {
  switch (value.kind) {
    case 'length':
      return `${trimNumber(value.value)}px`;
    case 'number':
      return trimNumber(value.value);
    case 'keyword':
      return value.value;
    case 'color': {
      const { hex, alpha } = value.value;
      if (alpha >= 0.995) {
        return hex;
      }
      const n = Number.parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${trimNumber(alpha)})`;
    }
    case 'shadow':
      return value.value.length === 0
        ? 'none'
        : value.value
            .map((s) =>
              formatShadow(s).replace(
                /#[0-9a-f]{6}( \/ \d+%)?/,
                cssValue({ kind: 'color', value: s.color }) ?? '',
              ),
            )
            .join(', ');
    case 'count':
    case 'none':
      return undefined;
  }
}
