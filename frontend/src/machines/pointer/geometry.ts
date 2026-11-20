import type { Region } from '@pfs/core';

export interface Cell {
  x: number;
  y: number;
}

/** Inclusive rectangle in grid cells. */
export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function normalize(a: Cell, b: Cell): Bounds {
  return {
    x0: Math.min(a.x, b.x),
    y0: Math.min(a.y, b.y),
    x1: Math.max(a.x, b.x),
    y1: Math.max(a.y, b.y),
  };
}

export function inside(c: Cell, b: Bounds): boolean {
  return c.x >= b.x0 && c.x <= b.x1 && c.y >= b.y0 && c.y <= b.y1;
}

/** Bounds of `region` placed at `at`, clamped to the grid. */
export function placedBounds(at: Cell, region: Region, w: number, h: number): Bounds {
  return {
    x0: Math.max(0, at.x),
    y0: Math.max(0, at.y),
    x1: Math.min(w - 1, at.x + region.w - 1),
    y1: Math.min(h - 1, at.y + region.h - 1),
  };
}
