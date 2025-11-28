import { useEffect, useRef, useState, useCallback } from 'react';
import Button from './ui/Button';
import type { Mode, LineState, DraggedPoint } from '../types';
import styles from './EditorCanvas.module.scss';

const SVG_NS = 'http://www.w3.org/2000/svg';

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
  const [draggedPoint, setDraggedPoint] = useState<DraggedPoint | null>(null);

  // Render paths and controls
  useEffect(() => {
    if (!svgRef.current) return;

    const activeLayer = activeLayerRef.current;
    const ghostLayer = ghostLayerRef.current;
    const controlsLayer = controlsLayerRef.current;

    if (!activeLayer || !ghostLayer || !controlsLayer) return;

    // Clear layers
    activeLayer.innerHTML = '';
    ghostLayer.innerHTML = '';
    controlsLayer.innerHTML = '';

    lines.forEach((line, index) => {
      const activePoints = line[mode];
      const ghostPoints = line[mode === 'menu' ? 'close' : 'menu'];

      // Draw Ghost Path (Reference)
      const ghostPath = document.createElementNS(SVG_NS, 'path');
      ghostPath.setAttribute(
        'd',
        `M ${ghostPoints[0].x} ${ghostPoints[0].y} L ${ghostPoints[1].x} ${ghostPoints[1].y}`
      );
      ghostPath.classList.add(styles.ghostPath);
      ghostLayer.appendChild(ghostPath);

      // Draw Active Path
      const activePath = document.createElementNS(SVG_NS, 'path');
      activePath.setAttribute(
        'd',
        `M ${activePoints[0].x} ${activePoints[0].y} L ${activePoints[1].x} ${activePoints[1].y}`
      );
      activePath.classList.add(styles.editorPath);
      activeLayer.appendChild(activePath);

      // Draw Controls for Active Path
      activePoints.forEach((point, pointIndex) => {
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', point.x.toString());
        circle.setAttribute('cy', point.y.toString());
        circle.setAttribute('r', '6');
        circle.classList.add(styles.controlPoint);
        circle.dataset.lineIndex = index.toString();
        circle.dataset.pointIndex = pointIndex.toString();
        controlsLayer.appendChild(circle);
      });
    });
  }, [lines, mode]);

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
    if (target.classList.contains(styles.controlPoint)) {
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
      newLines[draggedPoint.lineIndex][mode][draggedPoint.pointIndex] = { x, y };
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
      <svg ref={svgRef} className={styles.editorSvg} viewBox="0 0 100 100" onMouseDown={handleMouseDown}>
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

        {/* Control points */}
        <g ref={controlsLayerRef} id="controls-layer"></g>
      </svg>

      <Button className={styles.btnReset} onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}
