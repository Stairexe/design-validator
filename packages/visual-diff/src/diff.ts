import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface ImageDiff {
  /** PNG highlighting differing pixels over a faded copy of the website image. */
  diff: Uint8Array;
  width: number;
  height: number;
  mismatchedPixels: number;
  /** mismatchedPixels / (width × height), in [0, 1]. Evidence, not a score. */
  mismatchRatio: number;
}

function crop(png: PNG, width: number, height: number): Buffer {
  if (png.width === width && png.height === height) return png.data;
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    png.data.copy(out, y * width * 4, y * png.width * 4, y * png.width * 4 + width * 4);
  }
  return out;
}

/**
 * Compares two PNGs over their common top-left area. `threshold` is
 * pixelmatch's per-pixel colour sensitivity (0–1); anti-aliasing is ignored.
 */
export function diffImages(
  website: Uint8Array,
  design: Uint8Array,
  options: { threshold?: number } = {},
): ImageDiff {
  const a = PNG.sync.read(Buffer.from(website));
  const b = PNG.sync.read(Buffer.from(design));
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  if (width === 0 || height === 0) {
    throw new Error('Cannot diff empty images.');
  }
  const output = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    crop(a, width, height),
    crop(b, width, height),
    output.data,
    width,
    height,
    {
      threshold: options.threshold ?? 0.1,
      includeAA: false,
      alpha: 0.2,
      diffColor: [220, 38, 38],
    },
  );
  return {
    diff: new Uint8Array(PNG.sync.write(output)),
    width,
    height,
    mismatchedPixels,
    mismatchRatio: Math.round((mismatchedPixels / (width * height)) * 10_000) / 10_000,
  };
}

/** Width and height of a PNG without decoding pixels. */
export function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
