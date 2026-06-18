import type { Point } from '@/types';
import { SELECTION_PADDING } from '@/utils/geometry';
import type { ScaleHandle } from '@/hooks/useScaleInteraction';
import styles from './SelectionBox.module.scss';

const PIVOT_ARM = 4;
const PIVOT_HIT_RADIUS = 4;
const HANDLE_SQUARE_HALF = 1;
const ROTATE_ZONE_SIZE = 6;

const SCALE_HANDLE_LABELS: Record<ScaleHandle, string> = {
  tl: 'Scale handle, top-left corner',
  tc: 'Scale handle, top edge',
  tr: 'Scale handle, top-right corner',
  ml: 'Scale handle, left edge',
  mr: 'Scale handle, right edge',
  bl: 'Scale handle, bottom-left corner',
  bc: 'Scale handle, bottom edge',
  br: 'Scale handle, bottom-right corner',
};

interface ScaleHandleSpec {
  id: ScaleHandle;
  x: number;
  y: number;
  cursor: string;
}

interface RotateZoneSpec {
  id: 'tl' | 'tr' | 'bl' | 'br';
  x: number;
  y: number;
}

interface SelectionBoxProps {
  bbox: { x: number; y: number; width: number; height: number };
  pivot: Point;
  onRotateZoneMouseDown: (e: React.MouseEvent) => void;
  onPivotMouseDown: (e: React.MouseEvent) => void;
  onPivotDoubleClick: () => void;
  onBboxMouseDown: (e: React.MouseEvent) => void;
  onScaleHandleMouseDown: (e: React.MouseEvent, handle: ScaleHandle) => void;
}

export default function SelectionBox({
  bbox,
  pivot,
  onRotateZoneMouseDown,
  onPivotMouseDown,
  onPivotDoubleClick,
  onBboxMouseDown,
  onScaleHandleMouseDown,
}: SelectionBoxProps) {
  const left = bbox.x - SELECTION_PADDING;
  const top = bbox.y - SELECTION_PADDING;
  const width = bbox.width + SELECTION_PADDING * 2;
  const height = bbox.height + SELECTION_PADDING * 2;
  const right = left + width;
  const bottom = top + height;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  const scaleHandles: ScaleHandleSpec[] = [
    { id: 'tl', x: left, y: top, cursor: styles.cursorNwse },
    { id: 'tc', x: cx, y: top, cursor: styles.cursorNs },
    { id: 'tr', x: right, y: top, cursor: styles.cursorNesw },
    { id: 'ml', x: left, y: cy, cursor: styles.cursorEw },
    { id: 'mr', x: right, y: cy, cursor: styles.cursorEw },
    { id: 'bl', x: left, y: bottom, cursor: styles.cursorNesw },
    { id: 'bc', x: cx, y: bottom, cursor: styles.cursorNs },
    { id: 'br', x: right, y: bottom, cursor: styles.cursorNwse },
  ];

  const rotateZones: RotateZoneSpec[] = [
    { id: 'tl', x: left - ROTATE_ZONE_SIZE, y: top - ROTATE_ZONE_SIZE },
    { id: 'tr', x: right, y: top - ROTATE_ZONE_SIZE },
    { id: 'bl', x: left - ROTATE_ZONE_SIZE, y: bottom },
    { id: 'br', x: right, y: bottom },
  ];

  return (
    <g>
      <rect
        className={styles.bboxDragArea}
        x={left}
        y={top}
        width={width}
        height={height}
        onMouseDown={onBboxMouseDown}
      />
      <rect className={styles.selectionBox} x={left} y={top} width={width} height={height} />
      {rotateZones.map((zone) => (
        <rect
          key={zone.id}
          className={styles.rotateZone}
          x={zone.x}
          y={zone.y}
          width={ROTATE_ZONE_SIZE}
          height={ROTATE_ZONE_SIZE}
          onMouseDown={onRotateZoneMouseDown}
        />
      ))}
      {/* Painted after rotateZones so scale handle wins on corner overlap */}
      {scaleHandles.map((h) => (
        <rect
          key={h.id}
          className={`${styles.scaleHandle} ${h.cursor}`}
          x={h.x - HANDLE_SQUARE_HALF}
          y={h.y - HANDLE_SQUARE_HALF}
          width={HANDLE_SQUARE_HALF * 2}
          height={HANDLE_SQUARE_HALF * 2}
          onMouseDown={(e) => onScaleHandleMouseDown(e, h.id)}
          role="button"
          aria-label={SCALE_HANDLE_LABELS[h.id]}
          tabIndex={0}
        />
      ))}
      <g className={styles.pivot}>
        <line
          className={styles.selectionPivot}
          x1={pivot.x - PIVOT_ARM}
          y1={pivot.y}
          x2={pivot.x + PIVOT_ARM}
          y2={pivot.y}
        />
        <line
          className={styles.selectionPivot}
          x1={pivot.x}
          y1={pivot.y - PIVOT_ARM}
          x2={pivot.x}
          y2={pivot.y + PIVOT_ARM}
        />
        <circle
          className={styles.selectionPivotHit}
          cx={pivot.x}
          cy={pivot.y}
          r={PIVOT_HIT_RADIUS}
          onMouseDown={onPivotMouseDown}
          onDoubleClick={onPivotDoubleClick}
          role="button"
          aria-label="Rotation pivot. Drag to move pivot. Double-click to reset to bbox center."
          tabIndex={0}
        />
      </g>
    </g>
  );
}
