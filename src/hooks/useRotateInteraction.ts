import { useCallback, useEffect, useRef, useState } from 'react';
import { rotateLinesAroundPivot, snapAngle } from '@/utils/geometry';
import type { LineState, Mode, Point } from '@/types';

const SNAP_STEP_DEG = 15;
const SNAP_TOLERANCE_DEG = 3;

interface UseRotateInteractionArgs {
  selected: Set<number>;
  sourceIndices: Set<number>;
  mode: Mode;
  pivot: Point;
  lines: LineState[];
  onLinesChange: (lines: LineState[]) => void;
  onCommit?: (snapIndices: Set<number>) => void;
  getSVGPoint: (e: MouseEvent) => DOMPoint;
}

export interface RotateInteractionState {
  isRotating: boolean;
  currentAngleDeg: number;
  isSnapping: boolean;
  cursorPos: Point | null;
}

interface UseRotateInteractionResult {
  state: RotateInteractionState;
  beginRotate: (e: React.MouseEvent) => void;
}

export function useRotateInteraction(args: UseRotateInteractionArgs): UseRotateInteractionResult {
  const [state, setState] = useState<RotateInteractionState>({
    isRotating: false,
    currentAngleDeg: 0,
    isSnapping: false,
    cursorPos: null,
  });

  // Hot-path refs — listener stays bound for the entire drag.
  const argsRef = useRef(args);
  useEffect(() => {
    argsRef.current = args;
  }, [args]);

  const originLinesRef = useRef<LineState[] | null>(null);
  const originAngleRef = useRef(0);
  const pivotRef = useRef<Point>({ x: 0, y: 0 });
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

  const beginRotate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const current = argsRef.current;
    if (current.selected.size === 0) return;

    const startPt = current.getSVGPoint(e.nativeEvent);
    const dx0 = startPt.x - current.pivot.x;
    const dy0 = startPt.y - current.pivot.y;
    if (Math.hypot(dx0, dy0) < 0.5) return;

    originLinesRef.current = current.lines;
    pivotRef.current = current.pivot;
    selectedRef.current = current.selected;
    sourceRef.current = current.sourceIndices;
    modeRef.current = current.mode;
    originAngleRef.current = Math.atan2(dy0, dx0);

    setState({
      isRotating: true,
      currentAngleDeg: 0,
      isSnapping: false,
      cursorPos: { x: startPt.x, y: startPt.y },
    });

    const onMove = (ev: MouseEvent) => {
      const origin = originLinesRef.current;
      if (!origin) return;
      const pt = argsRef.current.getSVGPoint(ev);
      const pivot = pivotRef.current;
      const currentAngle = Math.atan2(pt.y - pivot.y, pt.x - pivot.x);
      let deltaDeg = ((currentAngle - originAngleRef.current) * 180) / Math.PI;
      const rawDeg = deltaDeg;
      deltaDeg = snapAngle(deltaDeg, SNAP_STEP_DEG, SNAP_TOLERANCE_DEG);
      const isSnapping = deltaDeg !== rawDeg;

      const next = rotateLinesAroundPivot(
        origin,
        selectedRef.current,
        sourceRef.current,
        modeRef.current,
        deltaDeg,
        pivot
      );
      argsRef.current.onLinesChange(next);

      setState({
        isRotating: true,
        currentAngleDeg: deltaDeg,
        isSnapping,
        cursorPos: { x: pt.x, y: pt.y },
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      activeListenersRef.current = null;
      originLinesRef.current = null;
      setState((s) => ({ ...s, isRotating: false, cursorPos: null }));
      argsRef.current.onCommit?.(selectedRef.current);
    };

    activeListenersRef.current = { onMove, onUp };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return { state, beginRotate };
}
