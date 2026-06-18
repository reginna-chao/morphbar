import { useCallback, useEffect, useRef, useState } from 'react';
import { computeBoundingBox, type BoundingBox } from '@/utils/geometry';
import type { AlignmentGuide, LineState, Mode, Point } from '@/types';

const GROUP_GUIDE_TOLERANCE = 1.5;
const GRID_SNAP = 5;
const CANVAS_CENTER = 50;
const DEGENERATE_EPSILON = 1e-6;

interface GroupAlignmentTargets {
  xs: number[];
  ys: number[];
}

interface TranslateSnapResult {
  dx: number;
  dy: number;
  guides: AlignmentGuide[];
}

interface ScaleMovingEdges {
  movingX: 'left' | 'right' | null;
  movingY: 'top' | 'bottom' | null;
}

interface ScaleSnapResult {
  sx: number;
  sy: number;
  guides: AlignmentGuide[];
}

interface AxisCandidate {
  ref: number;
  edge: 'left' | 'right' | 'top' | 'bottom' | 'center';
}

interface AxisMatch {
  target: number;
  dist: number;
  isCenter: boolean;
  candidate: AxisCandidate;
}

function findBestMatch(candidates: AxisCandidate[], targets: number[]): AxisMatch | null {
  let best: AxisMatch | null = null;
  for (const candidate of candidates) {
    for (const target of targets) {
      const dist = Math.abs(candidate.ref - target);
      if (dist > GROUP_GUIDE_TOLERANCE) continue;
      const isCenter = target === CANVAS_CENTER;
      if (!best) {
        best = { target, dist, isCenter, candidate };
        continue;
      }
      // Priority: when the SELECTION's center edge matches, prefer it over its
      // left/right (or top/bottom) edges — more natural in design tools. This
      // is independent of whether the matched TARGET happens to be canvas
      // center (that's `isCenter`, used downstream for guide styling).
      const candIsCenter = candidate.edge === 'center';
      const bestIsCenter = best.candidate.edge === 'center';
      if (candIsCenter && !bestIsCenter) {
        best = { target, dist, isCenter, candidate };
      } else if (candIsCenter === bestIsCenter && dist < best.dist) {
        best = { target, dist, isCenter, candidate };
      }
    }
  }
  return best;
}

export function useGroupAlignmentGuides(
  lines: LineState[],
  mode: Mode,
  selectedIndices: Set<number>,
  isDragging: boolean
) {
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);
  const targetsRef = useRef<GroupAlignmentTargets>({ xs: [], ys: [] });

  // Build targets once when drag starts; non-selected lines contribute their bbox
  // left/center/right + top/center/bottom plus the canvas center axes (x=50, y=50).
  useEffect(() => {
    if (!isDragging) {
      targetsRef.current = { xs: [], ys: [] };
      return;
    }
    const xs = new Set<number>([CANVAS_CENTER]);
    const ys = new Set<number>([CANVAS_CENTER]);
    lines.forEach((line, i) => {
      if (selectedIndices.has(i)) return;
      // Skip lines with no anchors in the active mode — computeBoundingBox
      // returns a (0,0,0,0) sentinel that would seed spurious snap targets.
      const hasAnchor = line[mode].some((p) => p.type === 'anchor');
      if (!hasAnchor) return;
      const bbox = computeBoundingBox(line[mode]);
      // Center is always exact: MIN_BBOX_SIZE padding is symmetric around the
      // anchor cluster, so bbox.x + bbox.width/2 equals the true center even
      // when rawWidth/rawHeight is 0.
      xs.add(bbox.x + bbox.width / 2);
      ys.add(bbox.y + bbox.height / 2);
      // Only add edges on axes with real extent — a padded edge would mislead
      // snap by MIN_BBOX_SIZE/2 for collinear / single-anchor lines.
      if (bbox.rawWidth > 0) {
        xs.add(bbox.x);
        xs.add(bbox.x + bbox.width);
      }
      if (bbox.rawHeight > 0) {
        ys.add(bbox.y);
        ys.add(bbox.y + bbox.height);
      }
    });
    targetsRef.current = { xs: Array.from(xs), ys: Array.from(ys) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const snapTranslate = useCallback(
    (
      originBbox: BoundingBox,
      rawDx: number,
      rawDy: number,
      lockedAxis: 'x' | 'y' | null
    ): TranslateSnapResult => {
      const guides: AlignmentGuide[] = [];
      let dx = rawDx;
      let dy = rawDy;
      let snappedX = false;
      let snappedY = false;

      if (lockedAxis !== 'x') {
        const left = originBbox.x;
        const center = originBbox.x + originBbox.width / 2;
        const right = originBbox.x + originBbox.width;
        const candidates: AxisCandidate[] = [
          { ref: left + rawDx, edge: 'left' },
          { ref: center + rawDx, edge: 'center' },
          { ref: right + rawDx, edge: 'right' },
        ];
        const match = findBestMatch(candidates, targetsRef.current.xs);
        if (match) {
          dx = match.target - match.candidate.ref + rawDx;
          guides.push({ axis: 'vertical', position: match.target, isCenter: match.isCenter });
          snappedX = true;
        }
      }

      if (lockedAxis !== 'y') {
        const top = originBbox.y;
        const center = originBbox.y + originBbox.height / 2;
        const bottom = originBbox.y + originBbox.height;
        const candidates: AxisCandidate[] = [
          { ref: top + rawDy, edge: 'top' },
          { ref: center + rawDy, edge: 'center' },
          { ref: bottom + rawDy, edge: 'bottom' },
        ];
        const match = findBestMatch(candidates, targetsRef.current.ys);
        if (match) {
          dy = match.target - match.candidate.ref + rawDy;
          guides.push({ axis: 'horizontal', position: match.target, isCenter: match.isCenter });
          snappedY = true;
        }
      }

      if (!snappedX && lockedAxis !== 'x') {
        const left = originBbox.x + rawDx;
        const snappedLeft = Math.round(left / GRID_SNAP) * GRID_SNAP;
        dx = snappedLeft - originBbox.x;
      }
      if (!snappedY && lockedAxis !== 'y') {
        const top = originBbox.y + rawDy;
        const snappedTop = Math.round(top / GRID_SNAP) * GRID_SNAP;
        dy = snappedTop - originBbox.y;
      }

      return { dx, dy, guides };
    },
    []
  );

  const snapScale = useCallback(
    (
      originBbox: BoundingBox,
      sx: number,
      sy: number,
      anchor: Point,
      movingEdges: ScaleMovingEdges
    ): ScaleSnapResult => {
      const guides: AlignmentGuide[] = [];
      let snappedSx = sx;
      let snappedSy = sy;

      if (movingEdges.movingX !== null) {
        const originEdgeX =
          movingEdges.movingX === 'left' ? originBbox.x : originBbox.x + originBbox.width;
        const denom = originEdgeX - anchor.x;
        if (Math.abs(denom) >= DEGENERATE_EPSILON) {
          const movedX = anchor.x + denom * sx;
          const candidates: AxisCandidate[] = [{ ref: movedX, edge: movingEdges.movingX }];
          const match = findBestMatch(candidates, targetsRef.current.xs);
          if (match) {
            snappedSx = (match.target - anchor.x) / denom;
            guides.push({ axis: 'vertical', position: match.target, isCenter: match.isCenter });
          }
        }
      }

      if (movingEdges.movingY !== null) {
        const originEdgeY =
          movingEdges.movingY === 'top' ? originBbox.y : originBbox.y + originBbox.height;
        const denom = originEdgeY - anchor.y;
        if (Math.abs(denom) >= DEGENERATE_EPSILON) {
          const movedY = anchor.y + denom * sy;
          const candidates: AxisCandidate[] = [{ ref: movedY, edge: movingEdges.movingY }];
          const match = findBestMatch(candidates, targetsRef.current.ys);
          if (match) {
            snappedSy = (match.target - anchor.y) / denom;
            guides.push({ axis: 'horizontal', position: match.target, isCenter: match.isCenter });
          }
        }
      }

      return { sx: snappedSx, sy: snappedSy, guides };
    },
    []
  );

  const clearGuides = useCallback(() => {
    setActiveGuides([]);
  }, []);

  return {
    activeGuides,
    setActiveGuides,
    clearGuides,
    snapTranslate,
    snapScale,
  };
}

export type { TranslateSnapResult, ScaleSnapResult, ScaleMovingEdges };
