import { useState, useRef, useCallback, useEffect } from 'react';
import type { LineState, Mode, DraggedPoint, AlignmentGuide } from '@/types';

const GUIDE_TOLERANCE = 2.5;

interface AlignmentTarget {
  x: number;
  y: number;
}

interface SnapResult {
  x: number;
  y: number;
  guides: AlignmentGuide[];
}

/**
 * Custom hook that manages alignment guides and snap behavior
 * during drag operations in the SVG editor.
 *
 * Accepts an array of dragged points to support multi-point drag —
 * all dragged points are excluded from alignment targets so the
 * grabbed point can snap freely without colliding with siblings.
 */
export function useAlignmentGuides(lines: LineState[], mode: Mode, draggedPoints: DraggedPoint[]) {
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);
  const targetsRef = useRef<AlignmentTarget[]>([]);
  const isDragging = draggedPoints.length > 0;

  // Compute alignment targets once when drag starts
  useEffect(() => {
    if (!isDragging) {
      targetsRef.current = [];
      return;
    }
    const draggedSet = new Set(draggedPoints.map((d) => `${d.lineIndex}:${d.pointIndex}`));
    const targets: AlignmentTarget[] = [];
    lines.forEach((line, lineIndex) => {
      const points = line[mode];
      points.forEach((point, pointIndex) => {
        if (point.type !== 'anchor') return;
        if (draggedSet.has(`${lineIndex}:${pointIndex}`)) return;
        targets.push({ x: point.x, y: point.y });
      });
    });
    targetsRef.current = targets;
    // Only recompute when drag starts (transitions from inactive to active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const computeSnap = useCallback(
    (rawX: number, rawY: number, lockedAxis: 'x' | 'y' | null): SnapResult => {
      let x = rawX;
      let y = rawY;
      const guides: AlignmentGuide[] = [];

      // Track closest match per axis
      let closestXDist = Infinity;
      let closestYDist = Infinity;
      let bestXSnap: { value: number; isCenter: boolean } | null = null;
      let bestYSnap: { value: number; isCenter: boolean } | null = null;

      // Treat center (50, 50) as another candidate, not unconditional priority
      const allCandidates: Array<AlignmentTarget & { isCenter: boolean }> = [
        { x: 50, y: 50, isCenter: true },
        ...targetsRef.current.map((t) => ({ ...t, isCenter: false })),
      ];

      for (const candidate of allCandidates) {
        if (lockedAxis !== 'x') {
          const dist = Math.abs(rawX - candidate.x);
          if (dist <= GUIDE_TOLERANCE && dist < closestXDist) {
            closestXDist = dist;
            bestXSnap = { value: candidate.x, isCenter: candidate.isCenter };
          }
        }
        if (lockedAxis !== 'y') {
          const dist = Math.abs(rawY - candidate.y);
          if (dist <= GUIDE_TOLERANCE && dist < closestYDist) {
            closestYDist = dist;
            bestYSnap = { value: candidate.y, isCenter: candidate.isCenter };
          }
        }
      }

      let snappedX = false;
      let snappedY = false;

      if (bestXSnap) {
        x = bestXSnap.value;
        snappedX = true;
        guides.push({ axis: 'vertical', position: bestXSnap.value, isCenter: bestXSnap.isCenter });
      }
      if (bestYSnap) {
        y = bestYSnap.value;
        snappedY = true;
        guides.push({
          axis: 'horizontal',
          position: bestYSnap.value,
          isCenter: bestYSnap.isCenter,
        });
      }

      // Fall back to grid snap for axes not snapped by guides
      if (!snappedX) x = Math.round(x / 5) * 5;
      if (!snappedY) y = Math.round(y / 5) * 5;

      return { x, y, guides };
    },
    []
  );

  const clearGuides = useCallback(() => {
    setActiveGuides([]);
  }, []);

  return { activeGuides, setActiveGuides, computeSnap, clearGuides };
}
