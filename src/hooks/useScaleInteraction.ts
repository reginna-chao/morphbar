import { useCallback, useEffect, useRef, useState } from 'react';
import { computeMultiLineBoundingBox, scaleLines, type BoundingBox } from '@/utils/geometry';
import type { AlignmentGuide, LineState, Mode, Point } from '@/types';

export type ScaleHandle = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br';

interface ScaleMovingEdges {
  movingX: 'left' | 'right' | null;
  movingY: 'top' | 'bottom' | null;
}

interface ScaleSnapResult {
  sx: number;
  sy: number;
  guides: AlignmentGuide[];
}

const MOVING_EDGES: Record<ScaleHandle, ScaleMovingEdges> = {
  tl: { movingX: 'left', movingY: 'top' },
  tc: { movingX: null, movingY: 'top' },
  tr: { movingX: 'right', movingY: 'top' },
  ml: { movingX: 'left', movingY: null },
  mr: { movingX: 'right', movingY: null },
  bl: { movingX: 'left', movingY: 'bottom' },
  bc: { movingX: null, movingY: 'bottom' },
  br: { movingX: 'right', movingY: 'bottom' },
};

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
  onCommit?: (snapIndices: Set<number>) => void;
  getSVGPoint: (e: MouseEvent) => DOMPoint;
  snapScale: (
    originBbox: BoundingBox,
    sx: number,
    sy: number,
    anchor: Point,
    movingEdges: ScaleMovingEdges
  ) => ScaleSnapResult;
  setActiveGuides: (guides: AlignmentGuide[]) => void;
  clearGuides: () => void;
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
  const left = bbox.x;
  const right = bbox.x + bbox.width;
  const top = bbox.y;
  const bottom = bbox.y + bbox.height;
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

function computeVirtualHandlePoint(handle: ScaleHandle, bbox: BoundingBox): Point {
  const left = bbox.x;
  const right = bbox.x + bbox.width;
  const top = bbox.y;
  const bottom = bbox.y + bbox.height;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  switch (handle) {
    case 'tl':
      return { x: left, y: top };
    case 'tc':
      return { x: cx, y: top };
    case 'tr':
      return { x: right, y: top };
    case 'ml':
      return { x: left, y: cy };
    case 'mr':
      return { x: right, y: cy };
    case 'bl':
      return { x: left, y: bottom };
    case 'bc':
      return { x: cx, y: bottom };
    case 'br':
      return { x: right, y: bottom };
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
  const originBboxRef = useRef<BoundingBox>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rawWidth: 0,
    rawHeight: 0,
  });
  const anchorRef = useRef<Point>({ x: 0, y: 0 });
  // Virtual handle = the unpadded geometry corner/edge midpoint that conceptually
  // sits under the user's click on the visible padded handle. Tracking this lets
  // scale math use the true geometry corner instead of the padded outline corner,
  // so the opposite side of the selection stays put while still preserving
  // identity (sx=sy=1) when the user clicks without dragging.
  const originVirtualHandleRef = useRef<Point>({ x: 0, y: 0 });
  const mouseToHandleOffsetRef = useRef<Point>({ x: 0, y: 0 });
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

    const virtualHandle = computeVirtualHandlePoint(handle, bbox);

    originLinesRef.current = current.lines;
    originPivotRef.current = current.pivotPos;
    originBboxRef.current = bbox;
    anchorRef.current = computeAnchor(handle, bbox);
    originVirtualHandleRef.current = virtualHandle;
    mouseToHandleOffsetRef.current = {
      x: virtualHandle.x - startPt.x,
      y: virtualHandle.y - startPt.y,
    };
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
      const bbox = originBboxRef.current;
      const offset = mouseToHandleOffsetRef.current;
      const originVirtualHandle = originVirtualHandleRef.current;
      // Re-evaluate altKey every frame so toggling Alt mid-drag swaps the anchor
      // dynamically (corner-anchored <-> center-anchored).
      const anchor: Point = ev.altKey
        ? { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 }
        : anchorRef.current;
      const virtualPt: Point = {
        x: pt.x + offset.x,
        y: pt.y + offset.y,
      };

      const xAxisActive =
        HORIZONTAL_AXIS_HANDLES.has(activeHandle) && bbox.rawWidth >= DEGENERATE_EPSILON;
      const yAxisActive =
        VERTICAL_AXIS_HANDLES.has(activeHandle) && bbox.rawHeight >= DEGENERATE_EPSILON;

      let sx = 1;
      let sy = 1;
      if (xAxisActive && Math.abs(originVirtualHandle.x - anchor.x) > DEGENERATE_EPSILON) {
        sx = (virtualPt.x - anchor.x) / (originVirtualHandle.x - anchor.x);
      }
      if (yAxisActive && Math.abs(originVirtualHandle.y - anchor.y) > DEGENERATE_EPSILON) {
        sy = (virtualPt.y - anchor.y) / (originVirtualHandle.y - anchor.y);
      }

      if (ev.shiftKey && CORNER_HANDLES.has(activeHandle)) {
        const factor = Math.max(Math.abs(sx), Math.abs(sy));
        sx = factor * (sx < 0 ? -1 : 1);
        sy = factor * (sy < 0 ? -1 : 1);
      }

      // Alt = symmetric scale around center. Both sides of the bbox move, so a
      // single snap target on one edge would arbitrarily pick a side — skip the
      // group-alignment snap and let the user keep precise control.
      if (!ev.altKey) {
        const movingEdges = MOVING_EDGES[activeHandle];
        const snap = argsRef.current.snapScale(bbox, sx, sy, anchor, movingEdges);
        sx = snap.sx;
        sy = snap.sy;
        argsRef.current.setActiveGuides(snap.guides);
      } else {
        argsRef.current.setActiveGuides([]);
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
      argsRef.current.clearGuides();
      setState({ isScaling: false, activeHandle: null });
      argsRef.current.onCommit?.(selectedRef.current);
    };

    activeListenersRef.current = { onMove, onUp };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return { state, beginScale };
}
