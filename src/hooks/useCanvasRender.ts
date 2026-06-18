import { useEffect, type RefObject } from 'react';
import { getLineColor } from '@/utils/colors';
import type { LineState, LineIndex, Mode, PathPoint, Tool } from '@/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface LayerRefs {
  active: RefObject<SVGGElement | null>;
  ghost: RefObject<SVGGElement | null>;
  controls: RefObject<SVGGElement | null>;
  connection: RefObject<SVGGElement | null>;
}

interface HoveredPoint {
  lineIndex: number;
  pointIndex: number;
  isHeadOrTail: boolean;
}

interface PenAddPreview {
  x: number;
  y: number;
  lineIndex: number;
}

interface UseCanvasRenderArgs {
  layers: LayerRefs;
  lines: LineState[];
  mode: Mode;
  mirrorTargetMap: Map<LineIndex, LineIndex>;
  hoveredPoint: HoveredPoint | null;
  penAddPreview: PenAddPreview | null;
  activeTool: Tool;
  isSelected: (lineIndex: number, pointIndex: number) => boolean;
  isLineSelected: (lineIndex: number) => boolean;
  styles: Record<string, string>;
}

function generatePathD(points: PathPoint[]): string {
  const anchors = points.filter((p) => p.type === 'anchor');
  if (anchors.length < 2) return '';
  const commands = [`M ${anchors[0].x} ${anchors[0].y}`];
  for (let i = 1; i < anchors.length; i++) {
    commands.push(`L ${anchors[i].x} ${anchors[i].y}`);
  }
  return commands.join(' ');
}

function clearLayer(layer: SVGGElement) {
  while (layer.firstChild) layer.removeChild(layer.firstChild);
}

function renderLine(
  line: LineState,
  index: number,
  args: UseCanvasRenderArgs,
  layers: { active: SVGGElement; ghost: SVGGElement; controls: SVGGElement }
) {
  const {
    lines,
    mode,
    mirrorTargetMap,
    hoveredPoint,
    activeTool,
    isSelected,
    isLineSelected,
    styles,
  } = args;
  const activePoints = line[mode];
  const ghostPoints = line[mode === 'menu' ? 'close' : 'menu'];
  const isMirrorTarget = mirrorTargetMap.has(index);
  const sourceLineIndex = mirrorTargetMap.get(index);
  const lineSelected = activeTool === 'transform' && isLineSelected(index);

  const ghostPathD = generatePathD(ghostPoints);
  if (ghostPathD) {
    const ghostPath = document.createElementNS(SVG_NS, 'path');
    ghostPath.setAttribute('d', ghostPathD);
    ghostPath.classList.add(styles.ghostPath);
    layers.ghost.appendChild(ghostPath);
  }

  const lineColor = getLineColor(index, line.color);
  const activePathD = generatePathD(activePoints);
  if (activePathD) {
    const activePath = document.createElementNS(SVG_NS, 'path');
    activePath.setAttribute('d', activePathD);
    activePath.dataset.lineIndex = index.toString();

    if (isMirrorTarget && sourceLineIndex !== undefined) {
      const sourceColor = getLineColor(sourceLineIndex, lines[sourceLineIndex]?.color);
      activePath.classList.add(styles.editorPath, styles.mirrorTargetPath);
      activePath.setAttribute('stroke', sourceColor);
    } else {
      activePath.classList.add(styles.editorPath);
      activePath.setAttribute('stroke', lineColor);
      if (lineSelected) {
        activePath.classList.add(styles.selectedLinePath);
      }
    }
    layers.active.appendChild(activePath);
  }

  activePoints.forEach((point, pointIndex) => {
    if (point.type !== 'anchor') return;

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', point.x.toString());
    circle.setAttribute('cy', point.y.toString());
    circle.setAttribute('r', '6');
    circle.dataset.lineIndex = index.toString();
    circle.dataset.pointIndex = pointIndex.toString();

    if (isMirrorTarget && sourceLineIndex !== undefined) {
      const sourceColor = getLineColor(sourceLineIndex, lines[sourceLineIndex]?.color);
      circle.classList.add(styles.controlPoint, styles.mirrorTargetPoint);
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', sourceColor);
    } else {
      circle.classList.add(styles.controlPoint);
      circle.setAttribute('fill', lineColor);
      if (isSelected(index, pointIndex)) {
        circle.classList.add(styles.selectedPoint);
      }
    }
    layers.controls.appendChild(circle);

    const isHoveredForRemove =
      !isMirrorTarget &&
      activeTool === 'pen-remove' &&
      hoveredPoint &&
      hoveredPoint.lineIndex === index &&
      hoveredPoint.pointIndex === pointIndex;
    if (isHoveredForRemove && activePoints.filter((p) => p.type === 'anchor').length > 2) {
      const minusIcon = document.createElementNS(SVG_NS, 'path');
      const size = 3;
      minusIcon.setAttribute('d', `M ${point.x - size} ${point.y} L ${point.x + size} ${point.y}`);
      minusIcon.classList.add(styles.penRemoveIcon);
      layers.controls.appendChild(minusIcon);
    }
  });
}

function renderHoverConnection(
  args: UseCanvasRenderArgs,
  hoveredPoint: HoveredPoint,
  connectionLayer: SVGGElement
) {
  const { lines, mode, styles } = args;
  if (hoveredPoint.lineIndex >= lines.length) return;

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

  if (!isHeadOrTail) return;

  const currentAnchors = lines[lineIndex][mode]
    .map((p, i) => (p.type === 'anchor' ? i : -1))
    .filter((i) => i !== -1);
  const oppositeAnchors = correspondingPoints
    .map((p, i) => (p.type === 'anchor' ? i : -1))
    .filter((i) => i !== -1);

  const isHead = pointIndex === currentAnchors[0];
  const correspondingPointIndex = isHead
    ? oppositeAnchors[0]
    : oppositeAnchors[oppositeAnchors.length - 1];
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

function renderPenAddPreview(
  args: UseCanvasRenderArgs,
  preview: PenAddPreview,
  connectionLayer: SVGGElement
) {
  const { lines, styles } = args;
  if (preview.lineIndex >= lines.length) return;

  const previewColor = getLineColor(preview.lineIndex, lines[preview.lineIndex]?.color);

  const previewCircle = document.createElementNS(SVG_NS, 'circle');
  previewCircle.setAttribute('cx', preview.x.toString());
  previewCircle.setAttribute('cy', preview.y.toString());
  previewCircle.setAttribute('r', '4.8');
  previewCircle.classList.add(styles.penAddPreview);
  previewCircle.dataset.lineIndex = preview.lineIndex.toString();
  previewCircle.setAttribute('fill', previewColor);
  previewCircle.setAttribute('stroke', previewColor);
  connectionLayer.appendChild(previewCircle);

  const plusIcon = document.createElementNS(SVG_NS, 'path');
  const size = 2.5;
  const { x: cx, y: cy } = preview;
  plusIcon.setAttribute(
    'd',
    `M ${cx} ${cy - size} L ${cx} ${cy + size} M ${cx - size} ${cy} L ${cx + size} ${cy}`
  );
  plusIcon.classList.add(styles.penAddPreviewIcon);
  connectionLayer.appendChild(plusIcon);
}

/**
 * Imperatively redraws the editor SVG layers (paths, controls, hover highlights,
 * pen-add preview) whenever any input changes. Kept as a hook so the EditorCanvas
 * component stays focused on event handling.
 */
export function useCanvasRender(args: UseCanvasRenderArgs) {
  const { layers, lines, hoveredPoint, penAddPreview, activeTool } = args;

  useEffect(() => {
    const active = layers.active.current;
    const ghost = layers.ghost.current;
    const controls = layers.controls.current;
    const connection = layers.connection.current;
    if (!active || !ghost || !controls || !connection) return;

    clearLayer(active);
    clearLayer(ghost);
    clearLayer(controls);
    clearLayer(connection);

    lines.forEach((line, index) => {
      renderLine(line, index, args, { active, ghost, controls });
    });

    if (hoveredPoint) {
      renderHoverConnection(args, hoveredPoint, connection);
    }

    if (penAddPreview && activeTool === 'pen-add') {
      renderPenAddPreview(args, penAddPreview, connection);
    }
    // args is rebuilt every render — depend on its individual fields instead.
    // args.styles is a stable CSS Module import; intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lines,
    args.mode,
    args.mirrorTargetMap,
    hoveredPoint,
    penAddPreview,
    activeTool,
    args.isSelected,
    args.isLineSelected,
    layers.active,
    layers.ghost,
    layers.controls,
    layers.connection,
  ]);
}
