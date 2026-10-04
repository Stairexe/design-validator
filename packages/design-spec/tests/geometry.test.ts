import { describe, expect, it } from 'vitest';

import { centerDistance, intersectionOverUnion, relativeBounds, scaleBounds } from '../src';

const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe('geometry', () => {
  it('computes intersection over union', () => {
    expect(intersectionOverUnion(box(0, 0, 10, 10), box(0, 0, 10, 10))).toBe(1);
    expect(intersectionOverUnion(box(0, 0, 10, 10), box(5, 0, 10, 10))).toBeCloseTo(1 / 3);
    expect(intersectionOverUnion(box(0, 0, 10, 10), box(20, 20, 10, 10))).toBe(0);
  });

  it('measures centre distance', () => {
    expect(centerDistance(box(0, 0, 10, 10), box(3, 4, 10, 10))).toBe(5);
  });

  it('computes relative and scaled bounds', () => {
    expect(relativeBounds(box(110, 60, 20, 20), box(100, 50, 200, 200))).toEqual(box(10, 10, 20, 20));
    expect(scaleBounds(box(10, 10, 20, 20), 0.5)).toEqual(box(5, 5, 10, 10));
  });
});
