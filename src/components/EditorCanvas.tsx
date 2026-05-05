import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import Button from './ui/Button';
import Toolbar from './Toolbar';
import TransformActions from './TransformActions';
import GuidesLayer from './GuidesLayer';
import SelectionBox from './SelectionBox';
import { toastOptions } from '@/config/toast';
import { useAlignmentGuides } from '@/hooks/useAlignmentGuides';
import { useBoxSelection, makeKey, parseKey } from '@/hooks/useBoxSelection';
import { useCanvasRender } from '@/hooks/useCanvasRender';
import { useLineSelection } from '@/hooks/useLineSelection';
import { useRotateInteraction } from '@/hooks/useRotateInteraction';
import { useScaleInteraction } from '@/hooks/useScaleInteraction';
import { useTranslateInteraction } from '@/hooks/useTranslateInteraction';
import {
  computeMultiLineBoundingBox,
  rotateLinesAroundPivot,
  snapPivotToBoundingBox,
} from '@/utils/geometry';
import type { Mode, LineState, DraggedPoint, Tool, LineIndex, Point } from '@/types';
import styles from './EditorCanvas.module.scss';
import { RotateCw } from 'lucide-react';

const SVG_NS = 'http://www.w3.org/2000/svg';
const EMPTY_MAP = new Map<LineIndex, LineIndex>();
const EMPTY_SET: Set<number> = new Set();
const PIVOT_SNAP_TOLERANCE = 3;
const PIVOT_BOUNDS_MIN = -50;
const PIVOT_BOUNDS_MAX = 150;

function readDataIndex(target: Element, attr: 'data-line-index' | 'data-point-index'): number {
  const raw = target.getAttribute(attr) ?? target.parentElement?.getAttribute(attr) ?? null;
  if (raw === null) return -1;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? -1 : value;
}

// Calculate shortest distance from point to line segment
function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

interface EditorCanvasProps {
  mode: Mode;
  lines: LineState[];
  onLinesChange: (lines: LineState[]) => void;
  onCommit: () => void;
  onReset: () => void;
  mirrorTargetMap?: Map<LineIndex, LineIndex>;
  sourceIndices?: Set<number>;
}

export default function EditorCanvas({
  mode,
  lines,
  onLinesChange,
  onCommit,
  onReset,
  mirrorTargetMap = EMPTY_MAP,
  sourceIndices = EMPTY_SET,
}: EditorCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const activeLayerRef = useRef<SVGGElement>(null);
  const ghostLayerRef = useRef<SVGGElement>(null);
  const controlsLayerRef = useRef<SVGGElement>(null);
  const connectionLayerRef = useRef<SVGGElement>(null);
  const marqueeLayerRef = useRef<SVGGElement>(null);

  const [draggedPoints, setDraggedPoints] = useState<DraggedPoint[]>([]);
  const anchorKeyRef = useRef<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    lineIndex: number;
    pointIndex: number;
    isHeadOrTail: boolean;
  } | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [penAddPreview, setPenAddPreview] = useState<{
    x: number;
    y: number;
    lineIndex: number;
  } | null>(null);
  const [showCrosshairCursor, setShowCrosshairCursor] = useState(false);

  const {
    selectedPoints,
    marqueeRect,
    isSelected,
    selectSingle,
    toggleSelection,
    clearSelection,
    pruneSelection,
    startMarquee,
    updateMarquee,
    endMarquee,
    cancelMarquee,
  } = useBoxSelection();

  const {
    selected: selectedLines,
    isLineSelected,
    selectSingle: selectSingleLine,
    toggleLine,
    clear: clearLineSelection,
    prune: pruneLineSelection,
  } = useLineSelection();

  const [pivotPos, setPivotPos] = useState<Point | null>(null);

  const bbox = useMemo(
    () => computeMultiLineBoundingBox(lines, selectedLines, mode),
    [lines, selectedLines, mode]
  );

  const effectivePivot: Point = useMemo(
    () => pivotPos ?? { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 },
    [pivotPos, bbox]
  );

  const getSVGPoint = useCallback((event: MouseEvent): DOMPoint => {
    const svg = svgRef.current;
    if (!svg) throw new Error('SVG element not found');
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) throw new Error('Failed to get screen CTM');
    return pt.matrixTransform(ctm.inverse());
  }, []);

  const { state: rotateState, beginRotate } = useRotateInteraction({
    selected: selectedLines,
    sourceIndices,
    mode,
    pivot: effectivePivot,
    lines,
    onLinesChange,
    onCommit,
    getSVGPoint,
  });

  const { activeGuides, setActiveGuides, computeSnap, clearGuides } = useAlignmentGuides(
    lines,
    mode,
    draggedPoints
  );

  const { state: translateState, beginTranslate } = useTranslateInteraction({
    selected: selectedLines,
    sourceIndices,
    mode,
    lines,
    pivot: effectivePivot,
    pivotPos,
    setPivotPos,
    onLinesChange,
    onCommit,
    getSVGPoint,
    computeSnap,
    setActiveGuides,
    clearGuides,
  });

  const { state: scaleState, beginScale } = useScaleInteraction({
    selected: selectedLines,
    sourceIndices,
    mode,
    lines,
    pivotPos,
    setPivotPos,
    onLinesChange,
    onCommit,
    getSVGPoint,
  });

  const handleRotateSelection = useCallback(
    (deg: number) => {
      if (selectedLines.size === 0 || deg === 0) return;
      if (
        rotateState.isRotating ||
        translateState.isTranslating ||
        scaleState.isScaling ||
        draggedPoints.length > 0
      ) {
        return;
      }
      const next = rotateLinesAroundPivot(
        lines,
        selectedLines,
        sourceIndices,
        mode,
        deg,
        effectivePivot
      );
      onLinesChange(next);
      onCommit();
    },
    [
      lines,
      selectedLines,
      sourceIndices,
      mode,
      effectivePivot,
      onLinesChange,
      onCommit,
      rotateState.isRotating,
      translateState.isTranslating,
      scaleState.isScaling,
      draggedPoints.length,
    ]
  );

  // Refs let drag/marquee handlers stay stable so window listeners aren't
  // rebound on every render (e.g. every move during a drag updates `lines`).
  const linesRef = useRef(lines);
  const modeRef = useRef(mode);
  const mirrorTargetMapRef = useRef(mirrorTargetMap);
  const draggedPointsRef = useRef<DraggedPoint[]>([]);
  const onLinesChangeRef = useRef(onLinesChange);
  const marqueeAdditiveRef = useRef(false);
  const pivotDragListenersRef = useRef<{
    onMove: (e: MouseEvent) => void;
    onUp: () => void;
  } | null>(null);
  useEffect(() => {
    return () => {
      const active = pivotDragListenersRef.current;
      if (active) {
        window.removeEventListener('mousemove', active.onMove);
        window.removeEventListener('mouseup', active.onUp);
        pivotDragListenersRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    linesRef.current = lines;
    modeRef.current = mode;
    mirrorTargetMapRef.current = mirrorTargetMap;
    onLinesChangeRef.current = onLinesChange;
  }, [lines, mode, mirrorTargetMap, onLinesChange]);
  useEffect(() => {
    draggedPointsRef.current = draggedPoints;
  }, [draggedPoints]);

  // Clear selection on mode change or when leaving the Select tool.
  useEffect(() => {
    clearSelection();
  }, [mode, clearSelection]);
  useEffect(() => {
    if (activeTool !== 'select') clearSelection();
    if (activeTool !== 'transform') clearLineSelection();
  }, [activeTool, clearSelection, clearLineSelection]);
  // Drop the custom pivot only when the selection becomes empty; shift-click
  // extending a multi-selection should preserve the user's pivot.
  useEffect(() => {
    if (selectedLines.size === 0) setPivotPos(null);
  }, [selectedLines]);
  useEffect(() => {
    setPivotPos(null);
  }, [mode]);
  // When lines/mirror targets change (e.g. line removed, anchor deleted,
  // mirror group toggled), drop only entries that no longer reference a
  // valid anchor — keep selections that still point at real points.
  useEffect(() => {
    pruneSelection(lines, mode, mirrorTargetMap);
  }, [lines, mode, mirrorTargetMap, pruneSelection]);
  useEffect(() => {
    const targets = new Set<number>(mirrorTargetMap.keys());
    pruneLineSelection(lines.length, targets);
  }, [lines, mirrorTargetMap, pruneLineSelection]);

  // Keyboard: V/A/D/R switch tools, Esc clears selection or falls back to Select.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target?.isContentEditable ?? false);
      const key = e.key.toLowerCase();
      const noModifiers = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!isInputTarget && noModifiers) {
        if (key === 'r') {
          setActiveTool('transform');
          return;
        }
        if (key === 'v') {
          setActiveTool('select');
          return;
        }
        if (key === 'a') {
          setActiveTool('pen-add');
          return;
        }
        if (key === 'd') {
          setActiveTool('pen-remove');
          return;
        }
      }
      if (e.key === 'Escape') {
        if (activeTool === 'transform') {
          if (selectedLines.size > 0) {
            clearLineSelection();
          } else if (marqueeRect === null && draggedPoints.length === 0) {
            setActiveTool('select');
          }
          return;
        }
        if (activeTool === 'select') {
          clearSelection();
          cancelMarquee();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    activeTool,
    clearSelection,
    cancelMarquee,
    clearLineSelection,
    selectedLines,
    marqueeRect,
    draggedPoints,
  ]);

  useEffect(() => {
    if (draggedPoints.length === 0) return;
    document.body.classList.add('is-point-dragging');
    return () => document.body.classList.remove('is-point-dragging');
  }, [draggedPoints.length]);

  useEffect(() => {
    if (rotateState.isRotating) {
      document.body.classList.add('is-rotating');
      return () => document.body.classList.remove('is-rotating');
    }
  }, [rotateState.isRotating]);

  useEffect(() => {
    if (translateState.isTranslating) {
      document.body.classList.add('is-translating');
      return () => document.body.classList.remove('is-translating');
    }
  }, [translateState.isTranslating]);

  useEffect(() => {
    if (!scaleState.isScaling || !scaleState.activeHandle) return;
    const handle = scaleState.activeHandle;
    let direction: 'nwse' | 'nesw' | 'ns' | 'ew';
    if (handle === 'tl' || handle === 'br') direction = 'nwse';
    else if (handle === 'tr' || handle === 'bl') direction = 'nesw';
    else if (handle === 'tc' || handle === 'bc') direction = 'ns';
    else direction = 'ew';
    const cls = `is-scaling-${direction}`;
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [scaleState.isScaling, scaleState.activeHandle]);

  useCanvasRender({
    layers: {
      active: activeLayerRef,
      ghost: ghostLayerRef,
      controls: controlsLayerRef,
      connection: connectionLayerRef,
    },
    lines,
    mode,
    mirrorTargetMap,
    hoveredPoint,
    penAddPreview,
    activeTool,
    isSelected,
    isLineSelected,
    styles,
  });

  // Render marquee rectangle
  useEffect(() => {
    const layer = marqueeLayerRef.current;
    if (!layer) return;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    if (!marqueeRect) return;

    const left = Math.min(marqueeRect.x1, marqueeRect.x2);
    const top = Math.min(marqueeRect.y1, marqueeRect.y2);
    const width = Math.abs(marqueeRect.x2 - marqueeRect.x1);
    const height = Math.abs(marqueeRect.y2 - marqueeRect.y1);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', left.toString());
    rect.setAttribute('y', top.toString());
    rect.setAttribute('width', width.toString());
    rect.setAttribute('height', height.toString());
    rect.classList.add(styles.marqueeRect);
    layer.appendChild(rect);
  }, [marqueeRect]);

  // Helpers reading current selection ----------------------------------------
  const getSinglySelected = (): { lineIndex: number; pointIndex: number } | null => {
    if (selectedPoints.size !== 1) return null;
    const [key] = Array.from(selectedPoints);
    return parseKey(key);
  };

  const buildOriginsForSelection = (): DraggedPoint[] => {
    const origins: DraggedPoint[] = [];
    selectedPoints.forEach((key) => {
      const { lineIndex, pointIndex } = parseKey(key);
      const p = lines[lineIndex]?.[mode]?.[pointIndex];
      if (!p) return;
      if (mirrorTargetMap.has(lineIndex)) return;
      origins.push({ lineIndex, pointIndex, originX: p.x, originY: p.y });
    });
    return origins;
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    const isControlPoint = target.classList.contains(styles.controlPoint);
    const isPath = target.classList.contains(styles.editorPath);

    // --- Transform tool: line-level selection + translate when clicking selected ---
    if (activeTool === 'transform') {
      if (isPath || isControlPoint) {
        const lineIndex = readDataIndex(target, 'data-line-index');
        if (lineIndex < 0 || lineIndex >= lines.length) return;
        if (mirrorTargetMap.has(lineIndex)) return;
        if (e.shiftKey) {
          toggleLine(lineIndex);
          return;
        }
        if (isLineSelected(lineIndex)) {
          beginTranslate(e);
          return;
        }
        selectSingleLine(lineIndex);
        return;
      }
      clearLineSelection();
      return;
    }

    // --- Pen- tool: delete anchor ---
    if (activeTool === 'pen-remove') {
      if (!isControlPoint) return;
      const lineIndex = readDataIndex(target, 'data-line-index');
      const pointIndex = readDataIndex(target, 'data-point-index');

      if (lineIndex < 0 || lineIndex >= lines.length) return;
      if (pointIndex < 0) return;
      if (mirrorTargetMap.has(lineIndex)) return;

      const newLines = structuredClone(lines);
      const anchors = newLines[lineIndex][mode].filter((p) => p.type === 'anchor');

      if (anchors.length > 2) {
        newLines[lineIndex][mode].splice(pointIndex, 1);
        setHoveredPoint(null);
        onLinesChange(newLines);
        onCommit();
      } else {
        toast.error('A line must have at least two points', toastOptions.error);
      }
      return;
    }

    // --- Pen+ tool: insert / extend ---
    if (activeTool === 'pen-add') {
      // Insert in middle of segment
      if (isPath) {
        const lineIndex = readDataIndex(target, 'data-line-index');

        if (lineIndex < 0 || lineIndex >= lines.length) return;
        if (mirrorTargetMap.has(lineIndex)) return;

        const pt = getSVGPoint(e.nativeEvent);
        const x = Math.round(pt.x / 5) * 5;
        const y = Math.round(pt.y / 5) * 5;

        const newLines = structuredClone(lines);
        const currentPoints = newLines[lineIndex][mode];
        const anchors = currentPoints.filter((p) => p.type === 'anchor');

        let minDist = Infinity;
        let insertAfterIndex = 0;
        for (let i = 0; i < anchors.length - 1; i++) {
          const p1 = anchors[i];
          const p2 = anchors[i + 1];
          const dist = pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
          if (dist < minDist) {
            minDist = dist;
            insertAfterIndex = i;
          }
        }

        const anchorIndices = currentPoints
          .map((p, i) => (p.type === 'anchor' ? i : -1))
          .filter((i) => i !== -1);
        const insertPosition = anchorIndices[insertAfterIndex + 1];

        newLines[lineIndex][mode].splice(insertPosition, 0, { x, y, type: 'anchor' });
        onLinesChange(newLines);
        onCommit();
        return;
      }

      // Extend head/tail (only when exactly one point is selected)
      const focused = getSinglySelected();
      if (focused && focused.lineIndex < lines.length && !isControlPoint && !isPath) {
        const { lineIndex, pointIndex } = focused;
        const currentPoints = lines[lineIndex][mode];
        const anchorIndices = currentPoints
          .map((p, i) => (p.type === 'anchor' ? i : -1))
          .filter((i) => i !== -1);

        const isHead = pointIndex === anchorIndices[0];
        const isTail = pointIndex === anchorIndices[anchorIndices.length - 1];

        if (isHead || isTail) {
          const pt = getSVGPoint(e.nativeEvent);
          const x = Math.round(pt.x / 5) * 5;
          const y = Math.round(pt.y / 5) * 5;

          const newLines = structuredClone(lines);

          if (isHead) {
            newLines[lineIndex][mode].unshift({ x, y, type: 'anchor' });
            selectSingle(lineIndex, 0);
          } else {
            newLines[lineIndex][mode].push({ x, y, type: 'anchor' });
            selectSingle(lineIndex, newLines[lineIndex][mode].length - 1);
          }
          onLinesChange(newLines);
          onCommit();
          return;
        }
      }

      // Pen+ also allows dragging a single control point
      if (isControlPoint) {
        const lineIndex = readDataIndex(target, 'data-line-index');
        const pointIndex = readDataIndex(target, 'data-point-index');
        if (lineIndex < 0 || lineIndex >= lines.length) return;
        if (pointIndex < 0) return;
        if (mirrorTargetMap.has(lineIndex)) return;

        const p = lines[lineIndex][mode][pointIndex];
        selectSingle(lineIndex, pointIndex);
        const key = makeKey(lineIndex, pointIndex);
        anchorKeyRef.current = key;
        setDraggedPoints([{ lineIndex, pointIndex, originX: p.x, originY: p.y }]);
      }
      return;
    }

    // --- Select tool ---
    if (activeTool === 'select') {
      if (isControlPoint) {
        const lineIndex = readDataIndex(target, 'data-line-index');
        const pointIndex = readDataIndex(target, 'data-point-index');

        if (lineIndex < 0 || lineIndex >= lines.length) return;
        if (pointIndex < 0) return;
        if (mirrorTargetMap.has(lineIndex)) return;

        const key = makeKey(lineIndex, pointIndex);
        const alreadySelected = selectedPoints.has(key);

        if (alreadySelected) {
          // Multi-drag: drag all selected points
          const origins = buildOriginsForSelection();
          if (origins.length === 0) return;
          anchorKeyRef.current = key;
          setDraggedPoints(origins);
          return;
        }

        if (e.shiftKey) {
          // Shift+Click on unselected: toggle, no drag
          toggleSelection(lineIndex, pointIndex);
          return;
        }

        // Replace selection and start single-point drag
        const p = lines[lineIndex][mode][pointIndex];
        selectSingle(lineIndex, pointIndex);
        anchorKeyRef.current = key;
        setDraggedPoints([{ lineIndex, pointIndex, originX: p.x, originY: p.y }]);
        return;
      }

      // Click empty area or path → start marquee
      const pt = getSVGPoint(e.nativeEvent);
      marqueeAdditiveRef.current = e.shiftKey;
      startMarquee(pt.x, pt.y);
    }
  };

  const handleMouseOver = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    if (target.classList.contains(styles.controlPoint)) {
      const lineIndex = readDataIndex(target, 'data-line-index');
      const pointIndex = readDataIndex(target, 'data-point-index');

      if (lineIndex < 0 || lineIndex >= lines.length) return;
      if (pointIndex < 0) return;

      const anchorIndices = lines[lineIndex][mode]
        .map((p, i) => (p.type === 'anchor' ? i : -1))
        .filter((i) => i !== -1);
      const isHeadOrTail =
        pointIndex === anchorIndices[0] || pointIndex === anchorIndices[anchorIndices.length - 1];

      setHoveredPoint({ lineIndex, pointIndex, isHeadOrTail });
    }
  };

  const handleMouseOut = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    if (target.classList.contains(styles.controlPoint)) {
      setHoveredPoint(null);
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;

    if (activeTool === 'pen-add') {
      if (target.classList.contains(styles.editorPath)) {
        const lineIndex = readDataIndex(target, 'data-line-index');
        if (lineIndex < 0 || lineIndex >= lines.length) return;
        const pt = getSVGPoint(e.nativeEvent);
        const x = Math.round(pt.x / 5) * 5;
        const y = Math.round(pt.y / 5) * 5;

        setPenAddPreview({ x, y, lineIndex });
        setShowCrosshairCursor(false);
      } else if (!target.classList.contains(styles.controlPoint)) {
        const focused = getSinglySelected();
        if (focused && focused.lineIndex < lines.length) {
          const currentPoints = lines[focused.lineIndex][mode];
          const anchorIndices = currentPoints
            .map((p, i) => (p.type === 'anchor' ? i : -1))
            .filter((i) => i !== -1);
          const isHead = focused.pointIndex === anchorIndices[0];
          const isTail = focused.pointIndex === anchorIndices[anchorIndices.length - 1];

          if (isHead || isTail) {
            setShowCrosshairCursor(true);
            setPenAddPreview(null);
          } else {
            setShowCrosshairCursor(false);
            setPenAddPreview(null);
          }
        } else {
          setShowCrosshairCursor(false);
          setPenAddPreview(null);
        }
      } else {
        setShowCrosshairCursor(false);
        setPenAddPreview(null);
      }
    } else {
      setPenAddPreview(null);
      setShowCrosshairCursor(false);
    }
  };

  const handleSvgMouseLeave = () => {
    setPenAddPreview(null);
    setShowCrosshairCursor(false);
  };

  // Multi-point drag: compute delta from anchor, apply to all dragged points.
  // Reads mutable inputs (lines, dragged set, callback) via refs so the
  // listener bound below doesn't have to be torn down on every move.
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const draggedPoints = draggedPointsRef.current;
      if (draggedPoints.length === 0) return;
      const anchorKey = anchorKeyRef.current;
      if (!anchorKey) return;
      const { lineIndex: aLine, pointIndex: aPoint } = parseKey(anchorKey);
      const anchor = draggedPoints.find((d) => d.lineIndex === aLine && d.pointIndex === aPoint);
      if (!anchor) return;

      const pt = getSVGPoint(e);
      let x = pt.x;
      let y = pt.y;

      let lockedAxis: 'x' | 'y' | null = null;
      if (e.shiftKey) {
        const adx = Math.abs(x - anchor.originX);
        const ady = Math.abs(y - anchor.originY);
        if (adx > ady) {
          y = anchor.originY;
          lockedAxis = 'y';
        } else {
          x = anchor.originX;
          lockedAxis = 'x';
        }
      }

      const snap = computeSnap(x, y, lockedAxis);
      x = snap.x;
      y = snap.y;
      setActiveGuides(snap.guides);

      const dx = x - anchor.originX;
      const dy = y - anchor.originY;

      const updatesByLine = new Map<number, Map<number, DraggedPoint>>();
      for (const d of draggedPoints) {
        let inner = updatesByLine.get(d.lineIndex);
        if (!inner) {
          inner = new Map();
          updatesByLine.set(d.lineIndex, inner);
        }
        inner.set(d.pointIndex, d);
      }

      const lines = linesRef.current;
      const mode = modeRef.current;
      const newLines = lines.map((line, i) => {
        const inner = updatesByLine.get(i);
        if (!inner) return line;
        return {
          ...line,
          [mode]: line[mode].map((p, j) => {
            const u = inner.get(j);
            return u ? { ...p, x: u.originX + dx, y: u.originY + dy } : p;
          }),
        };
      });
      onLinesChangeRef.current(newLines);
    },
    [computeSnap, setActiveGuides, getSVGPoint]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedPoints([]);
    anchorKeyRef.current = null;
    clearGuides();
    onCommit();
  }, [clearGuides, onCommit]);

  useEffect(() => {
    if (draggedPoints.length === 0) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedPoints, handleMouseMove, handleMouseUp]);

  const beginPivotDrag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const onMove = (ev: MouseEvent) => {
        const pt = getSVGPoint(ev);
        const snapped = snapPivotToBoundingBox({ x: pt.x, y: pt.y }, bbox, PIVOT_SNAP_TOLERANCE);
        const clamped = {
          x: Math.max(PIVOT_BOUNDS_MIN, Math.min(PIVOT_BOUNDS_MAX, snapped.x)),
          y: Math.max(PIVOT_BOUNDS_MIN, Math.min(PIVOT_BOUNDS_MAX, snapped.y)),
        };
        setPivotPos(clamped);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        pivotDragListenersRef.current = null;
      };
      pivotDragListenersRef.current = { onMove, onUp };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [bbox, getSVGPoint]
  );

  // Marquee drag listeners — bound only on start, unbound on end
  const isMarqueeing = marqueeRect !== null;
  useEffect(() => {
    if (!isMarqueeing) return;
    document.body.classList.add('is-marqueeing');
    return () => document.body.classList.remove('is-marqueeing');
  }, [isMarqueeing]);
  useEffect(() => {
    if (!isMarqueeing) return;

    const onMove = (e: MouseEvent) => {
      const pt = getSVGPoint(e);
      updateMarquee(pt.x, pt.y);
    };
    const onUp = () => {
      endMarquee(
        linesRef.current,
        modeRef.current,
        mirrorTargetMapRef.current,
        marqueeAdditiveRef.current
      );
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarqueeing]);

  return (
    <div className={styles.editorArea}>
      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <TransformActions
        activeTool={activeTool}
        selectedCount={selectedLines.size}
        onRotate={handleRotateSelection}
        disabled={
          rotateState.isRotating ||
          translateState.isTranslating ||
          scaleState.isScaling ||
          draggedPoints.length > 0
        }
      />
      <svg
        ref={svgRef}
        className={`${styles.editorSvg} ${showCrosshairCursor ? styles.cursorCrosshair : ''}`}
        viewBox="0 0 100 100"
        role="application"
        aria-label="Path editor canvas. Drag points to move them. Drag empty area to box-select. Press Escape to clear selection."
        onMouseDown={handleMouseDown}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onMouseMove={handleSvgMouseMove}
        onMouseLeave={handleSvgMouseLeave}
      >
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />

        <g ref={ghostLayerRef} id="ghost-layer"></g>
        <g ref={activeLayerRef} id="active-layer"></g>
        <g ref={connectionLayerRef} id="connection-layer"></g>

        <GuidesLayer guides={activeGuides} />

        <g ref={controlsLayerRef} id="controls-layer"></g>
        <g ref={marqueeLayerRef} id="marquee-layer"></g>

        {activeTool === 'transform' && selectedLines.size > 0 && (
          <SelectionBox
            bbox={bbox}
            pivot={effectivePivot}
            isSnapping={rotateState.isSnapping}
            onRotateHandleMouseDown={beginRotate}
            onPivotMouseDown={beginPivotDrag}
            onPivotDoubleClick={() => setPivotPos(null)}
            onBboxMouseDown={beginTranslate}
            onScaleHandleMouseDown={beginScale}
          />
        )}

        {rotateState.isRotating && rotateState.cursorPos && (
          <foreignObject
            x={rotateState.cursorPos.x}
            y={rotateState.cursorPos.y}
            width="60"
            height="20"
            style={{ overflow: 'visible', pointerEvents: 'none' }}
          >
            <div className={styles.angleLabel}>
              {rotateState.currentAngleDeg >= 0 ? '+' : ''}
              {rotateState.isSnapping
                ? Math.round(rotateState.currentAngleDeg)
                : rotateState.currentAngleDeg.toFixed(1)}
              °
            </div>
          </foreignObject>
        )}
      </svg>

      <Button className={styles.btnReset} startIcon={<RotateCw />} onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}
