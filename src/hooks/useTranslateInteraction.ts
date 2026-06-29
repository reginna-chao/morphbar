import { useCallback, useEffect, useRef, useState } from 'react';
import { computeMultiLineBoundingBox, translateLines, type BoundingBox } from '@/utils/geometry';
import type { AlignmentGuide, LineState, Mode, Point } from '@/types';

interface TranslateSnapResult {
  dx: number;
  dy: number;
  guides: AlignmentGuide[];
}

interface UseTranslateInteractionArgs {
  selected: Set<number>;
  sourceIndices: Set<number>;
  mode: Mode;
  lines: LineState[];
  pivotPos: Point | null;
  setPivotPos: (p: Point | null) => void;
  onLinesChange: (lines: LineState[]) => void;
  onCommit?: (snapIndices: Set<number>) => void;
  getSVGPoint: (e: MouseEvent) => DOMPoint;
  snapTranslate: (
    originBbox: BoundingBox,
    rawDx: number,
    rawDy: number,
    lockedAxis: 'x' | 'y' | null
  ) => TranslateSnapResult;
  setActiveGuides: (guides: AlignmentGuide[]) => void;
  clearGuides: () => void;
}

export interface TranslateInteractionState {
  isTranslating: boolean;
}

interface UseTranslateInteractionResult {
  state: TranslateInteractionState;
  beginTranslate: (e: React.MouseEvent) => void;
}

export function useTranslateInteraction(
  args: UseTranslateInteractionArgs
): UseTranslateInteractionResult {
  const [state, setState] = useState<TranslateInteractionState>({ isTranslating: false });

  const argsRef = useRef(args);
  useEffect(() => {
    argsRef.current = args;
  }, [args]);

  const originLinesRef = useRef<LineState[] | null>(null);
  const originPivotRef = useRef<Point | null>(null);
  const originMouseRef = useRef<Point>({ x: 0, y: 0 });
  const originBboxRef = useRef<BoundingBox>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rawWidth: 0,
    rawHeight: 0,
  });
  const selectedRef = useRef<Set<number>>(new Set());
  const sourceRef = useRef<Set<number>>(new Set());
  const modeRef = useRef<Mode>('menu');
  const activeListenersRef = useRef<{
    onMove: (e: MouseEvent) => void;
    onUp: () => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      const active = activeListenersRef.current;
      if (active) {
        window.removeEventListener('mousemove', active.onMove);
        window.removeEventListener('mouseup', active.onUp);
        activeListenersRef.current = null;
      }
    };
  }, []);

  const beginTranslate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const current = argsRef.current;
    if (current.selected.size === 0) return;

    const startPt = current.getSVGPoint(e.nativeEvent);

    originLinesRef.current = current.lines;
    originPivotRef.current = current.pivotPos;
    originMouseRef.current = { x: startPt.x, y: startPt.y };
    originBboxRef.current = computeMultiLineBoundingBox(
      current.lines,
      current.selected,
      current.mode
    );
    selectedRef.current = current.selected;
    sourceRef.current = current.sourceIndices;
    modeRef.current = current.mode;

    setState({ isTranslating: true });

    const onMove = (ev: MouseEvent) => {
      const origin = originLinesRef.current;
      if (!origin) return;
      const pt = argsRef.current.getSVGPoint(ev);
      const rawDx = pt.x - originMouseRef.current.x;
      const rawDy = pt.y - originMouseRef.current.y;

      let lockedAxis: 'x' | 'y' | null = null;
      let useDx = rawDx;
      let useDy = rawDy;
      if (ev.shiftKey) {
        if (Math.abs(rawDx) > Math.abs(rawDy)) {
          lockedAxis = 'y';
          useDy = 0;
        } else {
          lockedAxis = 'x';
          useDx = 0;
        }
      }

      const snap = argsRef.current.snapTranslate(originBboxRef.current, useDx, useDy, lockedAxis);
      const dx = snap.dx;
      const dy = snap.dy;

      argsRef.current.setActiveGuides(snap.guides);

      const next = translateLines(
        origin,
        selectedRef.current,
        sourceRef.current,
        modeRef.current,
        dx,
        dy
      );
      argsRef.current.onLinesChange(next);

      const originPivot = originPivotRef.current;
      if (originPivot) {
        argsRef.current.setPivotPos({ x: originPivot.x + dx, y: originPivot.y + dy });
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      activeListenersRef.current = null;
      originLinesRef.current = null;
      argsRef.current.clearGuides();
      setState({ isTranslating: false });
      argsRef.current.onCommit?.(selectedRef.current);
    };

    activeListenersRef.current = { onMove, onUp };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return { state, beginTranslate };
}
