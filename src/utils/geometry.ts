import type { LineState, Mode, PathPoint, Point } from '@/types';
import { SVG_VIEWBOX_SIZE } from '@/utils/mirror';

const SVG_CENTER: Point = { x: SVG_VIEWBOX_SIZE / 2, y: SVG_VIEWBOX_SIZE / 2 };
const ROUND_FACTOR = 1e4;
const MIN_BBOX_SIZE = 1;

function round4(value: number): number {
  return Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;
}

export function computeCentroid(points: PathPoint[]): Point {
  const anchors = points.filter((p) => p.type === 'anchor');
  if (anchors.length === 0) {
    return { ...SVG_CENTER };
  }

  let sumX = 0;
  let sumY = 0;
  for (const a of anchors) {
    sumX += a.x;
    sumY += a.y;
  }

  return {
    x: sumX / anchors.length,
    y: sumY / anchors.length,
  };
}

export function rotatePoints(points: PathPoint[], angleDeg: number, pivot: Point): PathPoint[] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return points.map((p) => {
    const dx = p.x - pivot.x;
    const dy = p.y - pivot.y;
    return {
      x: round4(pivot.x + dx * cos - dy * sin),
      y: round4(pivot.y + dx * sin + dy * cos),
      type: p.type,
    };
  });
}

export function rotateLineMode(points: PathPoint[], angleDeg: number): PathPoint[] {
  const pivot = computeCentroid(points);
  return rotatePoints(points, angleDeg, pivot);
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SELECTION_PADDING = 3;

export function computeBoundingBox(points: PathPoint[]): BoundingBox {
  const anchors = points.filter((p) => p.type === 'anchor');
  if (anchors.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of anchors) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  let width = maxX - minX;
  let height = maxY - minY;

  // Apply minimum size around the center for collinear/coincident points
  if (width < MIN_BBOX_SIZE) {
    const cx = (minX + maxX) / 2;
    minX = cx - MIN_BBOX_SIZE / 2;
    width = MIN_BBOX_SIZE;
  }
  if (height < MIN_BBOX_SIZE) {
    const cy = (minY + maxY) / 2;
    minY = cy - MIN_BBOX_SIZE / 2;
    height = MIN_BBOX_SIZE;
  }

  return { x: minX, y: minY, width, height };
}

export function computeMultiLineBoundingBox(
  lines: LineState[],
  indices: Set<number>,
  mode: Mode
): BoundingBox {
  if (indices.size === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let any = false;

  indices.forEach((i) => {
    const line = lines[i];
    if (!line) return;
    const anchors = line[mode].filter((p) => p.type === 'anchor');
    if (anchors.length === 0) return;
    any = true;
    for (const p of anchors) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  });

  if (!any) return { x: 0, y: 0, width: 0, height: 0 };

  let width = maxX - minX;
  let height = maxY - minY;

  if (width < MIN_BBOX_SIZE) {
    const cx = (minX + maxX) / 2;
    minX = cx - MIN_BBOX_SIZE / 2;
    width = MIN_BBOX_SIZE;
  }
  if (height < MIN_BBOX_SIZE) {
    const cy = (minY + maxY) / 2;
    minY = cy - MIN_BBOX_SIZE / 2;
    height = MIN_BBOX_SIZE;
  }

  return { x: minX, y: minY, width, height };
}

export function rotateLinesAroundPivot(
  lines: LineState[],
  indices: Set<number>,
  sourceIndices: Set<number>,
  mode: Mode,
  angleDeg: number,
  pivot: Point
): LineState[] {
  if (indices.size === 0 || angleDeg === 0) return lines;

  return lines.map((line, i) => {
    if (!indices.has(i)) return line;
    if (sourceIndices.has(i)) {
      return {
        ...line,
        menu: rotatePoints(line.menu, angleDeg, pivot),
        close: rotatePoints(line.close, angleDeg, pivot),
      };
    }
    return {
      ...line,
      [mode]: rotatePoints(line[mode], angleDeg, pivot),
    };
  });
}

export function translateLines(
  lines: LineState[],
  indices: Set<number>,
  sourceIndices: Set<number>,
  mode: Mode,
  dx: number,
  dy: number
): LineState[] {
  if (indices.size === 0 || (dx === 0 && dy === 0)) return lines;

  return lines.map((line, i) => {
    if (!indices.has(i)) return line;

    const shift = (points: PathPoint[]): PathPoint[] =>
      points.map((p) => ({
        ...p,
        x: round4(p.x + dx),
        y: round4(p.y + dy),
      }));

    if (sourceIndices.has(i)) {
      return { ...line, menu: shift(line.menu), close: shift(line.close) };
    }
    return { ...line, [mode]: shift(line[mode]) };
  });
}

export function snapAngle(angleDeg: number, step: number, toleranceDeg: number): number {
  const nearest = Math.round(angleDeg / step) * step;
  return Math.abs(angleDeg - nearest) <= toleranceDeg ? nearest : angleDeg;
}

// Snaps pivot to the 9 anchor positions of the VISIBLE (padded) selection frame.
export function snapPivotToBoundingBox(pivot: Point, bbox: BoundingBox, tolerance: number): Point {
  const left = bbox.x - SELECTION_PADDING;
  const right = bbox.x + bbox.width + SELECTION_PADDING;
  const top = bbox.y - SELECTION_PADDING;
  const bottom = bbox.y + bbox.height + SELECTION_PADDING;
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  const snapPoints: Point[] = [
    { x: left, y: top },
    { x: cx, y: top },
    { x: right, y: top },
    { x: right, y: cy },
    { x: right, y: bottom },
    { x: cx, y: bottom },
    { x: left, y: bottom },
    { x: left, y: cy },
    { x: cx, y: cy },
  ];

  let nearest: Point | null = null;
  let nearestDistSq = tolerance * tolerance;
  for (const sp of snapPoints) {
    const dx = sp.x - pivot.x;
    const dy = sp.y - pivot.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= nearestDistSq) {
      nearestDistSq = distSq;
      nearest = sp;
    }
  }
  return nearest ?? pivot;
}
