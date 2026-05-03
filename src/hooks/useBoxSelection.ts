import { useState, useCallback, useMemo } from 'react';
import type { LineState, Mode, MarqueeRect, LineIndex } from '@/types';

export type SelectedPointKey = string;

export function makeKey(lineIndex: number, pointIndex: number): SelectedPointKey {
  return `${lineIndex}:${pointIndex}`;
}

export function parseKey(key: SelectedPointKey): { lineIndex: number; pointIndex: number } {
  const [l, p] = key.split(':');
  return { lineIndex: Number(l), pointIndex: Number(p) };
}

function normalizeRect(rect: MarqueeRect): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  return {
    left: Math.min(rect.x1, rect.x2),
    right: Math.max(rect.x1, rect.x2),
    top: Math.min(rect.y1, rect.y2),
    bottom: Math.max(rect.y1, rect.y2),
  };
}

interface UseBoxSelectionResult {
  selectedPoints: Set<SelectedPointKey>;
  marqueeRect: MarqueeRect | null;
  isSelected: (lineIndex: number, pointIndex: number) => boolean;
  selectSingle: (lineIndex: number, pointIndex: number) => void;
  toggleSelection: (lineIndex: number, pointIndex: number) => void;
  clearSelection: () => void;
  startMarquee: (x: number, y: number) => void;
  updateMarquee: (x: number, y: number) => void;
  endMarquee: (
    lines: LineState[],
    mode: Mode,
    mirrorTargetMap: Map<LineIndex, LineIndex>,
    additive: boolean
  ) => void;
  cancelMarquee: () => void;
  getSelectedKeys: () => SelectedPointKey[];
}

const MIN_MARQUEE_SIZE = 1;

export function useBoxSelection(): UseBoxSelectionResult {
  const [selectedPoints, setSelectedPoints] = useState<Set<SelectedPointKey>>(new Set());
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);

  const isSelected = useCallback(
    (lineIndex: number, pointIndex: number): boolean =>
      selectedPoints.has(makeKey(lineIndex, pointIndex)),
    [selectedPoints]
  );

  const selectSingle = useCallback((lineIndex: number, pointIndex: number) => {
    setSelectedPoints(new Set([makeKey(lineIndex, pointIndex)]));
  }, []);

  const toggleSelection = useCallback((lineIndex: number, pointIndex: number) => {
    setSelectedPoints((prev) => {
      const next = new Set(prev);
      const key = makeKey(lineIndex, pointIndex);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPoints(new Set());
  }, []);

  const startMarquee = useCallback((x: number, y: number) => {
    setMarqueeRect({ x1: x, y1: y, x2: x, y2: y });
  }, []);

  const updateMarquee = useCallback((x: number, y: number) => {
    setMarqueeRect((prev) => (prev ? { ...prev, x2: x, y2: y } : prev));
  }, []);

  const cancelMarquee = useCallback(() => {
    setMarqueeRect(null);
  }, []);

  const endMarquee = useCallback(
    (
      lines: LineState[],
      mode: Mode,
      mirrorTargetMap: Map<LineIndex, LineIndex>,
      additive: boolean
    ) => {
      setMarqueeRect((rect) => {
        if (!rect) return null;
        const { left, right, top, bottom } = normalizeRect(rect);
        const width = right - left;
        const height = bottom - top;

        // Treat tiny / zero-size marquee as a "click on empty area"
        if (width < MIN_MARQUEE_SIZE && height < MIN_MARQUEE_SIZE) {
          if (!additive) setSelectedPoints(new Set());
          return null;
        }

        const hits = new Set<SelectedPointKey>();
        lines.forEach((line, lineIndex) => {
          if (mirrorTargetMap.has(lineIndex)) return;
          line[mode].forEach((point, pointIndex) => {
            if (point.type !== 'anchor') return;
            if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) {
              hits.add(makeKey(lineIndex, pointIndex));
            }
          });
        });

        setSelectedPoints((prev) => {
          if (!additive) return hits;
          const merged = new Set(prev);
          hits.forEach((k) => merged.add(k));
          return merged;
        });

        return null;
      });
    },
    []
  );

  const getSelectedKeys = useCallback(
    (): SelectedPointKey[] => Array.from(selectedPoints),
    [selectedPoints]
  );

  return useMemo(
    () => ({
      selectedPoints,
      marqueeRect,
      isSelected,
      selectSingle,
      toggleSelection,
      clearSelection,
      startMarquee,
      updateMarquee,
      endMarquee,
      cancelMarquee,
      getSelectedKeys,
    }),
    [
      selectedPoints,
      marqueeRect,
      isSelected,
      selectSingle,
      toggleSelection,
      clearSelection,
      startMarquee,
      updateMarquee,
      endMarquee,
      cancelMarquee,
      getSelectedKeys,
    ]
  );
}
