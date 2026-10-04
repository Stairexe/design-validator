import type { Bounds } from './types';

export function area(bounds: Bounds): number {
  return Math.max(0, bounds.width) * Math.max(0, bounds.height);
}

export function center(bounds: Bounds): { x: number; y: number } {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

export function intersection(a: Bounds, b: Bounds): Bounds | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

/** Intersection over union in [0, 1]. */
export function intersectionOverUnion(a: Bounds, b: Bounds): number {
  const overlap = intersection(a, b);
  if (!overlap) {
    return 0;
  }
  const shared = area(overlap);
  const union = area(a) + area(b) - shared;
  return union > 0 ? shared / union : 0;
}

export function centerDistance(a: Bounds, b: Bounds): number {
  const ca = center(a);
  const cb = center(b);
  return Math.hypot(ca.x - cb.x, ca.y - cb.y);
}

/** Bounds of `child` relative to `parent`'s origin. */
export function relativeBounds(child: Bounds, parent: Bounds): Bounds {
  return { x: child.x - parent.x, y: child.y - parent.y, width: child.width, height: child.height };
}

/**
 * Scales bounds from a design frame into a viewport (e.g. a 1440-wide frame
 * compared against a 1440 viewport has scale 1).
 */
export function scaleBounds(bounds: Bounds, scale: number): Bounds {
  return {
    x: bounds.x * scale,
    y: bounds.y * scale,
    width: bounds.width * scale,
    height: bounds.height * scale,
  };
}
