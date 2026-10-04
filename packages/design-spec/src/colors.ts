import type { ColorValue } from './types';

const NAMED_COLORS: Readonly<Record<string, string>> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  aqua: '#00ffff',
  magenta: '#ff00ff',
  fuchsia: '#ff00ff',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  maroon: '#800000',
  olive: '#808000',
  lime: '#00ff00',
  navy: '#000080',
  purple: '#800080',
  teal: '#008080',
  orange: '#ffa500',
};

export interface Rgba {
  r: number;
  g: number;
  b: number;
  /** 0–1 */
  a: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toHexByte = (value: number) =>
  Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, '0');
const roundAlpha = (value: number) => Math.round(clamp(value, 0, 1) * 1000) / 1000;

export function rgbaToColor({ r, g, b, a }: Rgba): ColorValue {
  return { hex: `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`, alpha: roundAlpha(a) };
}

/** Figma/XD style channels in 0–1. */
export function unitRgbaToColor(r: number, g: number, b: number, a = 1): ColorValue {
  return rgbaToColor({ r: r * 255, g: g * 255, b: b * 255, a });
}

export function colorToRgba(color: ColorValue): Rgba {
  const value = Number.parseInt(color.hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255, a: color.alpha };
}

function parseChannel(token: string, max: number): number | null {
  const trimmed = token.trim();
  if (trimmed.endsWith('%')) {
    const percent = Number(trimmed.slice(0, -1));
    return Number.isFinite(percent) ? (percent / 100) * max : null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function parseAlpha(token: string | undefined): number | null {
  if (token === undefined) {
    return 1;
  }
  return parseChannel(token, 1);
}

function splitArgs(args: string): string[] {
  // Supports both `rgb(1, 2, 3, 0.5)` and `rgb(1 2 3 / 0.5)`.
  const [channels = '', alpha] = args.split('/');
  const parts = channels
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (alpha !== undefined) {
    parts.push(alpha.trim());
  }
  return parts;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) {
    return [l * 255, l * 255, l * 255];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255];
}

/**
 * Parses CSS colour syntax (`#rgb`, `#rrggbb(aa)`, `rgb()/rgba()`,
 * `hsl()/hsla()`, common named colours, `transparent`) into a canonical
 * `ColorValue`. Returns `null` for anything unparseable (gradients, `currentColor`).
 */
export function parseColor(input: string | null | undefined): ColorValue | null {
  if (!input) {
    return null;
  }
  const value = input.trim().toLowerCase();

  if (value === 'transparent') {
    return { hex: '#000000', alpha: 0 };
  }
  const named = NAMED_COLORS[value];
  if (named) {
    return { hex: named, alpha: 1 };
  }

  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (!/^[0-9a-f]+$/.test(hex) || ![3, 4, 6, 8].includes(hex.length)) {
      return null;
    }
    if (hex.length <= 4) {
      hex = Array.from(hex)
        .map((char) => char + char)
        .join('');
    }
    const alpha = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { hex: `#${hex.slice(0, 6)}`, alpha: roundAlpha(alpha) };
  }

  const fn = /^(rgba?|hsla?)\((.*)\)$/.exec(value);
  if (!fn) {
    return null;
  }
  const [, name = '', args = ''] = fn;
  const parts = splitArgs(args);
  if (parts.length < 3 || parts.length > 4) {
    return null;
  }
  const alpha = parseAlpha(parts[3]);
  if (alpha === null) {
    return null;
  }

  if (name.startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map((part) => parseChannel(part, 255));
    if (r == null || g == null || b == null) {
      return null;
    }
    return rgbaToColor({ r, g, b, a: alpha });
  }

  const h = Number.parseFloat(parts[0] ?? '');
  const s = parseChannel(parts[1] ?? '', 1);
  const l = parseChannel(parts[2] ?? '', 1);
  if (!Number.isFinite(h) || s === null || l === null) {
    return null;
  }
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbaToColor({ r, g, b, a: alpha });
}

export function colorsEqual(
  a: ColorValue | null | undefined,
  b: ColorValue | null | undefined,
): boolean {
  if (!a || !b) {
    return (a ?? null) === (b ?? null);
  }
  return a.hex === b.hex && Math.abs(a.alpha - b.alpha) < 0.005;
}

/** Composites a translucent colour over an opaque background. */
export function flattenColor(
  color: ColorValue,
  background: ColorValue = { hex: '#ffffff', alpha: 1 },
): ColorValue {
  const fg = colorToRgba(color);
  const bg = colorToRgba(background);
  const mix = (f: number, b: number) => f * fg.a + b * (1 - fg.a);
  return rgbaToColor({ r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a: 1 });
}

function toLab({ r, g, b }: Rgba): [number, number, number] {
  const linear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/**
 * Perceptual distance (CIE76 ΔE) between two colours after flattening alpha
 * over white. 0 means identical; ~2.3 is a just-noticeable difference.
 */
export function colorDistance(a: ColorValue, b: ColorValue): number {
  const [l1, a1, b1] = toLab(colorToRgba(flattenColor(a)));
  const [l2, a2, b2] = toLab(colorToRgba(flattenColor(b)));
  return Math.round(Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100) / 100;
}

export function formatColor(color: ColorValue): string {
  return color.alpha >= 0.995 ? color.hex : `${color.hex} / ${Math.round(color.alpha * 100)}%`;
}
