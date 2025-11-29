import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import Button from './ui/Button';
import Toolbar from './Toolbar';
import type { Mode, LineState, DraggedPoint, Tool, PathPoint } from '../types';
import styles from './EditorCanvas.module.scss';

const SVG_NS = 'http://www.w3.org/2000/svg';

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
    // Line segment degenerates to a point
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  // Calculate projection parameter t
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1] range

  // Calculate projection point
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  // Return distance
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

interface EditorCanvasProps {
  mode: Mode;
  lines: LineState[];
  onLinesChange: (lines: LineState[]) => void;
  onReset: () => void;
}

export default function EditorCanvas({ mode, lines, onLinesChange, onReset }: EditorCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const activeLayerRef = useRef<SVGGElement>(null);
  const ghostLayerRef = useRef<SVGGElement>(null);
  const controlsLayerRef = useRef<SVGGElement>(null);
  const connectionLayerRef = useRef<SVGGElement>(null);
  const [draggedPoint, setDraggedPoint] = useState<DraggedPoint | null>(null);
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
  const [focusedPoint, setFocusedPoint] = useState<{
    lineIndex: number;
    pointIndex: number;
  } | null>(null);
  const [showCrosshairCursor, setShowCrosshairCursor] = useState(false);

  // Render paths and controls
  useEffect(() => {
    if (!svgRef.current) return;

    const activeLayer = activeLayerRef.current;
    const ghostLayer = ghostLayerRef.current;
    const controlsLayer = controlsLayerRef.current;
    const connectionLayer = connectionLayerRef.current;

    if (!activeLayer || !ghostLayer || !controlsLayer || !connectionLayer) return;

    // Clear layers
    activeLayer.innerHTML = '';
    ghostLayer.innerHTML = '';
    controlsLayer.innerHTML = '';
    connectionLayer.innerHTML = '';

    // Generate path string (connect anchor points only)
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

      // Draw Ghost Path (Reference)
      const ghostPathD = generatePathD(ghostPoints);
      if (ghostPathD) {
        const ghostPath = document.createElementNS(SVG_NS, 'path');
        ghostPath.setAttribute('d', ghostPathD);
        ghostPath.classList.add(styles.ghostPath);
        ghostLayer.appendChild(ghostPath);
      }

      // Draw Active Path
      const activePathD = generatePathD(activePoints);
      if (activePathD) {
        const activePath = document.createElementNS(SVG_NS, 'path');
        activePath.setAttribute('d', activePathD);
        activePath.classList.add(styles.editorPath);
        activePath.dataset.lineIndex = index.toString();
        activeLayer.appendChild(activePath);
      }

      // Draw Controls for Active Path (anchor points only)
      activePoints.forEach((point, pointIndex) => {
        if (point.type === 'anchor') {
          const circle = document.createElementNS(SVG_NS, 'circle');
          circle.setAttribute('cx', point.x.toString());
          circle.setAttribute('cy', point.y.toString());
          circle.setAttribute('r', '6');
          circle.classList.add(styles.controlPoint);

          // Add focused class if this point is focused
          if (
            focusedPoint &&
            focusedPoint.lineIndex === index &&
            focusedPoint.pointIndex === pointIndex
          ) {
            circle.classList.add(styles.focusedPoint);
          }

          circle.dataset.lineIndex = index.toString();
          circle.dataset.pointIndex = pointIndex.toString();
          controlsLayer.appendChild(circle);

          // Add minus icon for Pen- mode on hover
          if (
            activeTool === 'pen-remove' &&
            hoveredPoint &&
            hoveredPoint.lineIndex === index &&
            hoveredPoint.pointIndex === pointIndex
          ) {
            const anchors = activePoints.filter((p) => p.type === 'anchor');
            // Only show delete icon if we can delete (more than 2 anchors)
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

    // Draw connection and highlight corresponding path when hovering a point
    if (hoveredPoint !== null) {
      const { lineIndex, pointIndex, isHeadOrTail } = hoveredPoint;
      const oppositeMode = mode === 'menu' ? 'close' : 'menu';
      const correspondingPoints = lines[lineIndex][oppositeMode];

      // Safety check: ensure point still exists
      const activePoint = lines[lineIndex]?.[mode]?.[pointIndex];
      if (!activePoint) return;

      // Always highlight the entire corresponding path
      const correspondingPathD = generatePathD(correspondingPoints);
      if (correspondingPathD) {
        const highlightPath = document.createElementNS(SVG_NS, 'path');
        highlightPath.setAttribute('d', correspondingPathD);
        highlightPath.classList.add(styles.highlightedPath);
        connectionLayer.appendChild(highlightPath);
      }

      // Only show connection line and point if hovering head or tail
      if (isHeadOrTail) {
        // Find corresponding head/tail point index in opposite mode
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

        // Draw connection line
        const connectionLine = document.createElementNS(SVG_NS, 'line');
        connectionLine.setAttribute('x1', activePoint.x.toString());
        connectionLine.setAttribute('y1', activePoint.y.toString());
        connectionLine.setAttribute('x2', correspondingPoint.x.toString());
        connectionLine.setAttribute('y2', correspondingPoint.y.toString());
        connectionLine.classList.add(styles.connectionLine);
        connectionLayer.appendChild(connectionLine);

        // Highlight corresponding point
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

    // Draw Pen+ preview (semi-transparent circle with + icon)
    if (penAddPreview !== null && activeTool === 'pen-add') {
      // Circle (80% size = radius 4.8)
      const previewCircle = document.createElementNS(SVG_NS, 'circle');
      previewCircle.setAttribute('cx', penAddPreview.x.toString());
      previewCircle.setAttribute('cy', penAddPreview.y.toString());
      previewCircle.setAttribute('r', '4.8');
      previewCircle.classList.add(styles.penAddPreview);
      previewCircle.dataset.lineIndex = penAddPreview.lineIndex.toString();
      connectionLayer.appendChild(previewCircle);

      // Plus icon in the center
      const plusIcon = document.createElementNS(SVG_NS, 'path');
      const size = 2.5; // Half size of + icon
      const cx = penAddPreview.x;
      const cy = penAddPreview.y;
      plusIcon.setAttribute(
        'd',
        `M ${cx} ${cy - size} L ${cx} ${cy + size} M ${cx - size} ${cy} L ${cx + size} ${cy}`
      );
      plusIcon.classList.add(styles.penAddPreviewIcon);
      connectionLayer.appendChild(plusIcon);
    }
  }, [lines, mode, hoveredPoint, penAddPreview, activeTool, focusedPoint]);

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

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;

    // Set focus when clicking control point
    if (target.classList.contains(styles.controlPoint)) {
      const lineIndex = parseInt(target.getAttribute('data-line-index') || '0');
      const pointIndex = parseInt(target.getAttribute('data-point-index') || '0');
      setFocusedPoint({ lineIndex, pointIndex });
    } else {
      // Clear focus when clicking elsewhere
      setFocusedPoint(null);
    }

    // Pen- mode: Delete anchor point
    if (activeTool === 'pen-remove' && target.classList.contains(styles.controlPoint)) {
      const lineIndex = parseInt(target.getAttribute('data-line-index') || '0');
      const pointIndex = parseInt(target.getAttribute('data-point-index') || '0');

      const newLines = JSON.parse(JSON.stringify(lines)) as LineState[];
      const anchors = newLines[lineIndex][mode].filter((p) => p.type === 'anchor');

      // Keep at least 2 anchor points
      if (anchors.length > 2) {
        newLines[lineIndex][mode].splice(pointIndex, 1);
        setHoveredPoint(null); // Clear hover state to prevent accessing deleted point
        onLinesChange(newLines);
      } else {
        toast.error('A line must have at least two points', {
          position: 'top-center',
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
      return;
    }

    // Pen+ mode: Insert anchor point in middle of nearest segment, or extend head/tail points
    if (activeTool === 'pen-add') {
      // Case 1: Click path - insert in middle of segment
      if (target.classList.contains(styles.editorPath)) {
        const lineIndex = parseInt(
          target.getAttribute('data-line-index') ||
            target.parentElement?.getAttribute('data-line-index') ||
            '0'
        );
        const pt = getSVGPoint(e.nativeEvent as unknown as MouseEvent);

        // Grid snap
        const x = Math.round(pt.x / 5) * 5;
        const y = Math.round(pt.y / 5) * 5;

        const newLines = JSON.parse(JSON.stringify(lines)) as LineState[];
        const currentPoints = newLines[lineIndex][mode];
        const anchors = currentPoints.filter((p) => p.type === 'anchor');

        // Find nearest line segment to click position
        let minDist = Infinity;
        let insertAfterIndex = 0;

        for (let i = 0; i < anchors.length - 1; i++) {
          const p1 = anchors[i];
          const p2 = anchors[i + 1];

          // Calculate distance from point to segment
          const dist = pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
          if (dist < minDist) {
            minDist = dist;
            insertAfterIndex = i;
          }
        }

        // Find corresponding original index position (including control points)
        const anchorIndices = currentPoints
          .map((p, i) => (p.type === 'anchor' ? i : -1))
          .filter((i) => i !== -1);
        const insertPosition = anchorIndices[insertAfterIndex + 1];

        // Insert new anchor point
        newLines[lineIndex][mode].splice(insertPosition, 0, { x, y, type: 'anchor' });
        onLinesChange(newLines);
        return;
      }

      // Case 2: Click blank area - if head/tail point is focused, extend with new point
      if (
        focusedPoint &&
        !target.classList.contains(styles.controlPoint) &&
        !target.classList.contains(styles.editorPath)
      ) {
        const { lineIndex, pointIndex } = focusedPoint;
        const currentPoints = lines[lineIndex][mode];
        const anchorIndices = currentPoints
          .map((p, i) => (p.type === 'anchor' ? i : -1))
          .filter((i) => i !== -1);

        // Check if this is head or tail point
        const isHead = pointIndex === anchorIndices[0];
        const isTail = pointIndex === anchorIndices[anchorIndices.length - 1];

        if (isHead || isTail) {
          const pt = getSVGPoint(e.nativeEvent as unknown as MouseEvent);
          const x = Math.round(pt.x / 5) * 5;
          const y = Math.round(pt.y / 5) * 5;

          const newLines = JSON.parse(JSON.stringify(lines)) as LineState[];

          if (isHead) {
            // Insert new point at head
            newLines[lineIndex][mode].unshift({ x, y, type: 'anchor' });
            // Update focus to new head point (index becomes 0)
            setFocusedPoint({ lineIndex, pointIndex: 0 });
          } else {
            // Insert new point at tail
            newLines[lineIndex][mode].push({ x, y, type: 'anchor' });
            // Update focus to new tail point
            const newLength = newLines[lineIndex][mode].length;
            setFocusedPoint({ lineIndex, pointIndex: newLength - 1 });
          }

          onLinesChange(newLines);
          return;
        }
      }
    }

    // Select mode or Pen+ mode: Drag anchor points
    if (
      (activeTool === 'select' || activeTool === 'pen-add') &&
      target.classList.contains(styles.controlPoint)
    ) {
      const lineIndex = parseInt(target.getAttribute('data-line-index') || '0');
      const pointIndex = parseInt(target.getAttribute('data-point-index') || '0');
      const currentPoint = lines[lineIndex][mode][pointIndex];

      setDraggedPoint({
        lineIndex,
        pointIndex,
        originX: currentPoint.x,
        originY: currentPoint.y,
      });
    }
  };

  const handleMouseOver = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    if (target.classList.contains(styles.controlPoint)) {
      const lineIndex = parseInt(target.getAttribute('data-line-index') || '0');
      const pointIndex = parseInt(target.getAttribute('data-point-index') || '0');

      // Check if this point is head or tail (first or last anchor)
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

    // Pen+ mode: Show preview point or crosshair cursor
    if (activeTool === 'pen-add') {
      if (target.classList.contains(styles.editorPath)) {
        const lineIndex = parseInt(
          target.getAttribute('data-line-index') ||
            target.parentElement?.getAttribute('data-line-index') ||
            '0'
        );
        const pt = getSVGPoint(e.nativeEvent as unknown as MouseEvent);

        // Grid snap
        const x = Math.round(pt.x / 5) * 5;
        const y = Math.round(pt.y / 5) * 5;

        setPenAddPreview({ x, y, lineIndex });
        setShowCrosshairCursor(false);
      } else if (!target.classList.contains(styles.controlPoint)) {
        // Check if there is a focused head or tail point
        if (focusedPoint) {
          const currentPoints = lines[focusedPoint.lineIndex][mode];
          const anchorIndices = currentPoints
            .map((p, i) => (p.type === 'anchor' ? i : -1))
            .filter((i) => i !== -1);
          const isHead = focusedPoint.pointIndex === anchorIndices[0];
          const isTail = focusedPoint.pointIndex === anchorIndices[anchorIndices.length - 1];

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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggedPoint) return;

      const pt = getSVGPoint(e);
      let x = pt.x;
      let y = pt.y;

      // Shift Key: Axis Lock
      if (e.shiftKey) {
        const dx = Math.abs(x - draggedPoint.originX);
        const dy = Math.abs(y - draggedPoint.originY);

        if (dx > dy) {
          y = draggedPoint.originY; // Lock Y (Horizontal movement)
        } else {
          x = draggedPoint.originX; // Lock X (Vertical movement)
        }
      }

      // Grid Snap (5px)
      x = Math.round(x / 5) * 5;
      y = Math.round(y / 5) * 5;

      // Update State
      const newLines = JSON.parse(JSON.stringify(lines)) as LineState[];
      const currentPoint = newLines[draggedPoint.lineIndex][mode][draggedPoint.pointIndex];
      newLines[draggedPoint.lineIndex][mode][draggedPoint.pointIndex] = {
        ...currentPoint,
        x,
        y,
      };
      onLinesChange(newLines);
    },
    [draggedPoint, lines, mode, onLinesChange]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedPoint(null);
  }, []);

  useEffect(() => {
    if (!draggedPoint) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedPoint, handleMouseMove, handleMouseUp]);

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
        {/* Grid lines for reference */}
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

        {/* Ghost paths (other state) */}
        <g ref={ghostLayerRef} id="ghost-layer"></g>

        {/* Active paths */}
        <g ref={activeLayerRef} id="active-layer"></g>

        {/* Connection lines */}
        <g ref={connectionLayerRef} id="connection-layer"></g>

        {/* Control points */}
        <g ref={controlsLayerRef} id="controls-layer"></g>
      </svg>

      <Button className={styles.btnReset} onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}
