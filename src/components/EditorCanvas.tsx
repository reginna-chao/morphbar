import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import Button from './ui/Button';
import Toolbar from './Toolbar';
import GuidesLayer from './GuidesLayer';
import { getLineColor } from '@/utils/colors';
import { toastOptions } from '@/config/toast';
import { useAlignmentGuides } from '@/hooks/useAlignmentGuides';
import { useBoxSelection, makeKey, parseKey } from '@/hooks/useBoxSelection';
import type { Mode, LineState, DraggedPoint, Tool, PathPoint, LineIndex } from '@/types';
import styles from './EditorCanvas.module.scss';
import { RotateCw } from 'lucide-react';

const SVG_NS = 'http://www.w3.org/2000/svg';
const EMPTY_MAP = new Map<LineIndex, LineIndex>();

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
  onReset: () => void;
  mirrorTargetMap?: Map<LineIndex, LineIndex>;
}

export default function EditorCanvas({
  mode,
  lines,
  onLinesChange,
  onReset,
  mirrorTargetMap = EMPTY_MAP,
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
    startMarquee,
    updateMarquee,
    endMarquee,
    cancelMarquee,
  } = useBoxSelection();

  const { activeGuides, setActiveGuides, computeSnap, clearGuides } = useAlignmentGuides(
    lines,
    mode,
    draggedPoints
  );

  // Refs for marquee handler closure — avoid re-binding listeners every frame
  const linesRef = useRef(lines);
  const modeRef = useRef(mode);
  const mirrorTargetMapRef = useRef(mirrorTargetMap);
  const marqueeAdditiveRef = useRef(false);
  useEffect(() => {
    linesRef.current = lines;
    modeRef.current = mode;
    mirrorTargetMapRef.current = mirrorTargetMap;
  }, [lines, mode, mirrorTargetMap]);

  // Clear selection on mode change, tool leaves 'select', or line count change
  useEffect(() => {
    clearSelection();
  }, [mode, clearSelection]);
  useEffect(() => {
    if (activeTool !== 'select') clearSelection();
  }, [activeTool, clearSelection]);
  useEffect(() => {
    clearSelection();
  }, [lines.length, clearSelection]);

  // Esc clears selection (Select tool only)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTool === 'select') {
        clearSelection();
        cancelMarquee();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTool, clearSelection, cancelMarquee]);

  // Render paths and controls
  useEffect(() => {
    if (!svgRef.current) return;

    const activeLayer = activeLayerRef.current;
    const ghostLayer = ghostLayerRef.current;
    const controlsLayer = controlsLayerRef.current;
    const connectionLayer = connectionLayerRef.current;

    if (!activeLayer || !ghostLayer || !controlsLayer || !connectionLayer) return;

    while (activeLayer.firstChild) activeLayer.removeChild(activeLayer.firstChild);
    while (ghostLayer.firstChild) ghostLayer.removeChild(ghostLayer.firstChild);
    while (controlsLayer.firstChild) controlsLayer.removeChild(controlsLayer.firstChild);
    while (connectionLayer.firstChild) connectionLayer.removeChild(connectionLayer.firstChild);

    const generatePathD = (points: PathPoint[]) => {
      const anchors = points.filter((p) => p.type === 'anchor');
      if (anchors.length < 2) return '';

      const commands = [`M ${anchors[0].x} ${anchors[0].y}`];
      for (let i = 1; i < anchors.length; i++) {
        commands.push(`L ${anchors[i].x} ${anchors[i].y}`);
      }
      return commands.join(' ');
    };

    lines.forEach((line, index) => {
      const activePoints = line[mode];
      const ghostPoints = line[mode === 'menu' ? 'close' : 'menu'];
      const isMirrorTarget = mirrorTargetMap.has(index);
      const sourceLineIndex = mirrorTargetMap.get(index);

      const ghostPathD = generatePathD(ghostPoints);
      if (ghostPathD) {
        const ghostPath = document.createElementNS(SVG_NS, 'path');
        ghostPath.setAttribute('d', ghostPathD);
        ghostPath.classList.add(styles.ghostPath);
        ghostLayer.appendChild(ghostPath);
      }

      const lineColor = getLineColor(index, line.color);
      const activePathD = generatePathD(activePoints);
      if (activePathD) {
        const activePath = document.createElementNS(SVG_NS, 'path');
        activePath.setAttribute('d', activePathD);
        activePath.dataset.lineIndex = index.toString();

        if (isMirrorTarget && sourceLineIndex !== undefined) {
          const sourceColor = getLineColor(sourceLineIndex, lines[sourceLineIndex]?.color);
          activePath.classList.add(styles.editorPath);
          activePath.classList.add(styles.mirrorTargetPath);
          activePath.setAttribute('stroke', sourceColor);
        } else {
          activePath.classList.add(styles.editorPath);
          activePath.setAttribute('stroke', lineColor);
        }
        activeLayer.appendChild(activePath);
      }

      activePoints.forEach((point, pointIndex) => {
        if (point.type === 'anchor') {
          const circle = document.createElementNS(SVG_NS, 'circle');
          circle.setAttribute('cx', point.x.toString());
          circle.setAttribute('cy', point.y.toString());
          circle.setAttribute('r', '6');
          circle.dataset.lineIndex = index.toString();
          circle.dataset.pointIndex = pointIndex.toString();

          if (isMirrorTarget && sourceLineIndex !== undefined) {
            const sourceColor = getLineColor(sourceLineIndex, lines[sourceLineIndex]?.color);
            circle.classList.add(styles.controlPoint);
            circle.classList.add(styles.mirrorTargetPoint);
            circle.setAttribute('fill', 'transparent');
            circle.setAttribute('stroke', sourceColor);
          } else {
            circle.classList.add(styles.controlPoint);
            circle.setAttribute('fill', lineColor);

            if (isSelected(index, pointIndex)) {
              circle.classList.add(styles.selectedPoint);
            }
          }

          controlsLayer.appendChild(circle);

          if (
            !isMirrorTarget &&
            activeTool === 'pen-remove' &&
            hoveredPoint &&
            hoveredPoint.lineIndex === index &&
            hoveredPoint.pointIndex === pointIndex
          ) {
            const anchors = activePoints.filter((p) => p.type === 'anchor');
            if (anchors.length > 2) {
              const minusIcon = document.createElementNS(SVG_NS, 'path');
              const size = 3;
              minusIcon.setAttribute(
                'd',
                `M ${point.x - size} ${point.y} L ${point.x + size} ${point.y}`
              );
              minusIcon.classList.add(styles.penRemoveIcon);
              controlsLayer.appendChild(minusIcon);
            }
          }
        }
      });
    });

    if (hoveredPoint !== null && hoveredPoint.lineIndex < lines.length) {
      const { lineIndex, pointIndex, isHeadOrTail } = hoveredPoint;
      const oppositeMode = mode === 'menu' ? 'close' : 'menu';
      const correspondingPoints = lines[lineIndex][oppositeMode];

      const activePoint = lines[lineIndex]?.[mode]?.[pointIndex];
      if (!activePoint) return;

      const correspondingPathD = generatePathD(correspondingPoints);
      if (correspondingPathD) {
        const highlightPath = document.createElementNS(SVG_NS, 'path');
        highlightPath.setAttribute('d', correspondingPathD);
        highlightPath.classList.add(styles.highlightedPath);
        connectionLayer.appendChild(highlightPath);
      }

      if (isHeadOrTail) {
        const currentAnchorIndices = lines[lineIndex][mode]
          .map((p, i) => (p.type === 'anchor' ? i : -1))
          .filter((i) => i !== -1);
        const oppositeAnchorIndices = correspondingPoints
          .map((p, i) => (p.type === 'anchor' ? i : -1))
          .filter((i) => i !== -1);

        const isHead = pointIndex === currentAnchorIndices[0];
        const correspondingPointIndex = isHead
          ? oppositeAnchorIndices[0]
          : oppositeAnchorIndices[oppositeAnchorIndices.length - 1];
        const correspondingPoint = correspondingPoints[correspondingPointIndex];

        const connectionLine = document.createElementNS(SVG_NS, 'line');
        connectionLine.setAttribute('x1', activePoint.x.toString());
        connectionLine.setAttribute('y1', activePoint.y.toString());
        connectionLine.setAttribute('x2', correspondingPoint.x.toString());
        connectionLine.setAttribute('y2', correspondingPoint.y.toString());
        connectionLine.classList.add(styles.connectionLine);
        connectionLayer.appendChild(connectionLine);

        const correspondingCircle = document.createElementNS(SVG_NS, 'circle');
        correspondingCircle.setAttribute('cx', correspondingPoint.x.toString());
        correspondingCircle.setAttribute('cy', correspondingPoint.y.toString());
        correspondingCircle.setAttribute('r', '6');
        correspondingCircle.setAttribute(
          'style',
          `transform-origin: ${correspondingPoint.x}px ${correspondingPoint.y}px;`
        );
        correspondingCircle.classList.add(styles.correspondingPoint);
        connectionLayer.appendChild(correspondingCircle);
      }
    }

    if (
      penAddPreview !== null &&
      activeTool === 'pen-add' &&
      penAddPreview.lineIndex < lines.length
    ) {
      const previewCircle = document.createElementNS(SVG_NS, 'circle');
      previewCircle.setAttribute('cx', penAddPreview.x.toString());
      previewCircle.setAttribute('cy', penAddPreview.y.toString());
      previewCircle.setAttribute('r', '4.8');
      previewCircle.classList.add(styles.penAddPreview);
      previewCircle.dataset.lineIndex = penAddPreview.lineIndex.toString();
      const previewColor = getLineColor(
        penAddPreview.lineIndex,
        lines[penAddPreview.lineIndex]?.color
      );
      previewCircle.setAttribute('fill', previewColor);
      previewCircle.setAttribute('stroke', previewColor);
      connectionLayer.appendChild(previewCircle);

      const plusIcon = document.createElementNS(SVG_NS, 'path');
      const size = 2.5;
      const cx = penAddPreview.x;
      const cy = penAddPreview.y;
      plusIcon.setAttribute(
        'd',
        `M ${cx} ${cy - size} L ${cx} ${cy + size} M ${cx - size} ${cy} L ${cx + size} ${cy}`
      );
      plusIcon.classList.add(styles.penAddPreviewIcon);
      connectionLayer.appendChild(plusIcon);
    }
  }, [
    lines,
    mode,
    hoveredPoint,
    penAddPreview,
    activeTool,
    selectedPoints,
    mirrorTargetMap,
    isSelected,
  ]);

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

  const getSVGPoint = (event: MouseEvent): DOMPoint => {
    const svg = svgRef.current;
    if (!svg) throw new Error('SVG element not found');

    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) throw new Error('Failed to get screen CTM');
    return pt.matrixTransform(ctm.inverse());
  };

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

    // --- Pen- tool: delete anchor ---
    if (activeTool === 'pen-remove') {
      if (!isControlPoint) return;
      const lineIndex = parseInt(target.getAttribute('data-line-index') || '0');
      const pointIndex = parseInt(target.getAttribute('data-point-index') || '0');

      if (lineIndex >= lines.length) return;
      if (mirrorTargetMap.has(lineIndex)) return;

      const newLines = JSON.parse(JSON.stringify(lines)) as LineState[];
      const anchors = newLines[lineIndex][mode].filter((p) => p.type === 'anchor');

      if (anchors.length > 2) {
        newLines[lineIndex][mode].splice(pointIndex, 1);
        setHoveredPoint(null);
        onLinesChange(newLines);
      } else {
        toast.error('A line must have at least two points', toastOptions.error);
      }
      return;
    }

    // --- Pen+ tool: insert / extend ---
    if (activeTool === 'pen-add') {
      // Insert in middle of segment
      if (isPath) {
        const lineIndex = parseInt(
          target.getAttribute('data-line-index') ||
            target.parentElement?.getAttribute('data-line-index') ||
            '0'
        );

        if (lineIndex >= lines.length) return;
        if (mirrorTargetMap.has(lineIndex)) return;

        const pt = getSVGPoint(e.nativeEvent as unknown as MouseEvent);
        const x = Math.round(pt.x / 5) * 5;
        const y = Math.round(pt.y / 5) * 5;

        const newLines = JSON.parse(JSON.stringify(lines)) as LineState[];
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
          const pt = getSVGPoint(e.nativeEvent as unknown as MouseEvent);
          const x = Math.round(pt.x / 5) * 5;
          const y = Math.round(pt.y / 5) * 5;

          const newLines = JSON.parse(JSON.stringify(lines)) as LineState[];

          if (isHead) {
            newLines[lineIndex][mode].unshift({ x, y, type: 'anchor' });
            // selection cleared by lines.length effect, then re-set below
          } else {
            newLines[lineIndex][mode].push({ x, y, type: 'anchor' });
          }
          onLinesChange(newLines);
          return;
        }
      }

      // Pen+ also allows dragging a single control point
      if (isControlPoint) {
        const lineIndex = parseInt(target.getAttribute('data-line-index') || '0');
        const pointIndex = parseInt(target.getAttribute('data-point-index') || '0');
        if (lineIndex >= lines.length) return;
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
        const lineIndex = parseInt(target.getAttribute('data-line-index') || '0');
        const pointIndex = parseInt(target.getAttribute('data-point-index') || '0');

        if (lineIndex >= lines.length) return;
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
      const pt = getSVGPoint(e.nativeEvent as unknown as MouseEvent);
      marqueeAdditiveRef.current = e.shiftKey;
      startMarquee(pt.x, pt.y);
    }
  };

  const handleMouseOver = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    if (target.classList.contains(styles.controlPoint)) {
      const lineIndex = parseInt(target.getAttribute('data-line-index') || '0');
      const pointIndex = parseInt(target.getAttribute('data-point-index') || '0');

      if (lineIndex >= lines.length) return;

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
        const lineIndex = parseInt(
          target.getAttribute('data-line-index') ||
            target.parentElement?.getAttribute('data-line-index') ||
            '0'
        );
        const pt = getSVGPoint(e.nativeEvent as unknown as MouseEvent);
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

  // Multi-point drag: compute delta from anchor, apply to all dragged points
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
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

      // Build line→(pointIndex→origin) lookup once per move
      const updatesByLine = new Map<number, Map<number, DraggedPoint>>();
      for (const d of draggedPoints) {
        let inner = updatesByLine.get(d.lineIndex);
        if (!inner) {
          inner = new Map();
          updatesByLine.set(d.lineIndex, inner);
        }
        inner.set(d.pointIndex, d);
      }

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
      onLinesChange(newLines);
    },
    [draggedPoints, lines, mode, onLinesChange, computeSnap, setActiveGuides]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedPoints([]);
    anchorKeyRef.current = null;
    clearGuides();
  }, [clearGuides]);

  useEffect(() => {
    if (draggedPoints.length === 0) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedPoints, handleMouseMove, handleMouseUp]);

  // Marquee drag listeners — bound only on start, unbound on end
  const isMarqueeing = marqueeRect !== null;
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
      <svg
        ref={svgRef}
        className={`${styles.editorSvg} ${showCrosshairCursor ? styles.cursorCrosshair : ''}`}
        viewBox="0 0 100 100"
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
      </svg>

      <Button className={styles.btnReset} startIcon={<RotateCw />} onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}
