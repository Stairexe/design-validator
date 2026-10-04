import {
  centerDistance,
  intersectionOverUnion,
  scaleBounds,
  type Bounds,
} from '@design-validator/design-spec';

/**
 * Geometric agreement in [0, 1] after scaling design bounds into the
 * implementation viewport: overlap, centre proximity and size ratio.
 */
export function geometryScore(
  design: Bounds,
  implementation: Bounds,
  scale: number,
  viewportWidth: number,
): number {
  const scaled = scaleBounds(design, scale);
  const iou = intersectionOverUnion(scaled, implementation);
  const proximity =
    1 - Math.min(1, centerDistance(scaled, implementation) / Math.max(200, viewportWidth * 0.25));
  const ratio = (a: number, b: number) =>
    a <= 0 || b <= 0 ? (a === b ? 1 : 0) : Math.min(a, b) / Math.max(a, b);
  const size =
    (ratio(scaled.width, implementation.width) + ratio(scaled.height, implementation.height)) / 2;
  return 0.4 * iou + 0.35 * proximity + 0.25 * size;
}

/** Cheap pre-filter: is the pair close enough to be worth scoring geometrically? */
export function isNearby(
  design: Bounds,
  implementation: Bounds,
  scale: number,
  viewportWidth: number,
): boolean {
  const scaled = scaleBounds(design, scale);
  return (
    centerDistance(scaled, implementation) < Math.max(300, viewportWidth * 0.4) ||
    intersectionOverUnion(scaled, implementation) > 0
  );
}
