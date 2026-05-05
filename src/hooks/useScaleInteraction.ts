import { useCallback, useEffect, useRef, useState } from 'react';
import {
  computeMultiLineBoundingBox,
  scaleLines,
  SELECTION_PADDING,
  type BoundingBox,
} from '@/utils/geometry';
import type { LineState, Mode, Point } from '@/types';

export type ScaleHandle = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br';

const CORNER_HANDLES: ReadonlySet<ScaleHandle> = new Set(['tl', 'tr', 'bl', 'br']);
const HORIZONTAL_AXIS_HANDLES: ReadonlySet<ScaleHandle> = new Set([
  'tl',
  'tr',
  'bl',
  'br',
  'ml',
  'mr',
]);
const VERTICAL_AXIS_HANDLES: ReadonlySet<ScaleHandle> = new Set([
  'tl',
  'tr',
  'bl',
  'br',
  'tc',
  'bc',
]);
const DEGENERATE_EPSILON = 1e-6;

interface UseScaleInteractionArgs {
  selected: Set<number>;
  sourceIndices: Set<number>;
  mode: Mode;
  lines: LineState[];
  pivotPos: Point | null;
  setPivotPos: (p: Point | null) => void;
  onLinesChange: (lines: LineState[]) => void;
  onCommit?: () => void;
  getSVGPoint: (e: MouseEvent) => DOMPoint;
}

export interface ScaleInteractionState {
  isScaling: boolean;
  activeHandle: ScaleHandle | null;
}

interface UseScaleInteractionResult {
  state: ScaleInteractionState;
  beginScale: (e: React.MouseEvent, handle: ScaleHandle) => void;
}

function computeAnchor(handle: ScaleHandle, bbox: BoundingBox): Point {
  const left = bbox.x - SELECTION_PADDING;
  const right = bbox.x + bbox.width + SELECTION_PADDING;
  const top = bbox.y - SELECTION_PADDING;
  const bottom = bbox.y + bbox.height + SELECTION_PADDING;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  switch (handle) {
    case 'tl':
      return { x: right, y: bottom };
    case 'tc':
      return { x: cx, y: bottom };
    case 'tr':
      return { x: left, y: bottom };
    case 'ml':
      return { x: right, y: cy };
    case 'mr':
      return { x: left, y: cy };
    case 'bl':
      return { x: right, y: top };
    case 'bc':
      return { x: cx, y: top };
    case 'br':
      return { x: left, y: top };
  }
}

export function useScaleInteraction(args: UseScaleInteractionArgs): UseScaleInteractionResult {
  const [state, setState] = useState<ScaleInteractionState>({
    isScaling: false,
    activeHandle: null,
  });

  const argsRef = useRef(args);
  useEffect(() => {
    argsRef.current = args;
  }, [args]);

  // Freeze selection/source/mode/origin at mousedown so mid-drag selection
  // changes don't redirect the scale operation.
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
  const anchorRef = useRef<Point>({ x: 0, y: 0 });
  const handleRef = useRef<ScaleHandle | null>(null);
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

  const beginScale = useCallback((e: React.MouseEvent, handle: ScaleHandle) => {
    e.stopPropagation();
    e.preventDefault();

    const current = argsRef.current;
    if (current.selected.size === 0) return;

    const startPt = current.getSVGPoint(e.nativeEvent);
    const bbox = computeMultiLineBoundingBox(current.lines, current.selected, current.mode);

    originLinesRef.current = current.lines;
    originPivotRef.current = current.pivotPos;
    originMouseRef.current = { x: startPt.x, y: startPt.y };
    originBboxRef.current = bbox;
    anchorRef.current = computeAnchor(handle, bbox);
    handleRef.current = handle;
    selectedRef.current = current.selected;
    sourceRef.current = current.sourceIndices;
    modeRef.current = current.mode;

    setState({ isScaling: true, activeHandle: handle });

    const onMove = (ev: MouseEvent) => {
      const origin = originLinesRef.current;
      const activeHandle = handleRef.current;
      if (!origin || !activeHandle) return;

      const pt = argsRef.current.getSVGPoint(ev);
      const anchor = anchorRef.current;
      const originMouse = originMouseRef.current;
      const bbox = originBboxRef.current;

      const xAxisActive =
        HORIZONTAL_AXIS_HANDLES.has(activeHandle) && bbox.rawWidth >= DEGENERATE_EPSILON;
      const yAxisActive =
        VERTICAL_AXIS_HANDLES.has(activeHandle) && bbox.rawHeight >= DEGENERATE_EPSILON;

      let sx = 1;
      let sy = 1;
      if (xAxisActive && Math.abs(originMouse.x - anchor.x) > DEGENERATE_EPSILON) {
        sx = (pt.x - anchor.x) / (originMouse.x - anchor.x);
      }
      if (yAxisActive && Math.abs(originMouse.y - anchor.y) > DEGENERATE_EPSILON) {
        sy = (pt.y - anchor.y) / (originMouse.y - anchor.y);
      }

      if (ev.shiftKey && CORNER_HANDLES.has(activeHandle)) {
        const factor = Math.max(Math.abs(sx), Math.abs(sy));
        sx = factor * (sx < 0 ? -1 : 1);
        sy = factor * (sy < 0 ? -1 : 1);
      }

      const next = scaleLines(
        origin,
        selectedRef.current,
        sourceRef.current,
        modeRef.current,
        sx,
        sy,
        anchor
      );
      argsRef.current.onLinesChange(next);

      const originPivot = originPivotRef.current;
      if (originPivot) {
        argsRef.current.setPivotPos({
          x: anchor.x + (originPivot.x - anchor.x) * sx,
          y: anchor.y + (originPivot.y - anchor.y) * sy,
        });
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      activeListenersRef.current = null;
      originLinesRef.current = null;
      handleRef.current = null;
      setState({ isScaling: false, activeHandle: null });
      argsRef.current.onCommit?.();
    };

    activeListenersRef.current = { onMove, onUp };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return { state, beginScale };
}
