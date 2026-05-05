import type { Point } from '@/types';
import { SELECTION_PADDING } from '@/utils/geometry';
import styles from './SelectionBox.module.scss';

const HANDLE_OFFSET = 8;
const HANDLE_RADIUS = 2.5;
const PIVOT_ARM = 4;
const PIVOT_HIT_RADIUS = 4;

interface SelectionBoxProps {
  bbox: { x: number; y: number; width: number; height: number };
  pivot: Point;
  isSnapping: boolean;
  onHandleMouseDown: (e: React.MouseEvent) => void;
  onPivotMouseDown: (e: React.MouseEvent) => void;
  onPivotDoubleClick: () => void;
  onBboxMouseDown: (e: React.MouseEvent) => void;
}

export default function SelectionBox({
  bbox,
  pivot,
  isSnapping,
  onHandleMouseDown,
  onPivotMouseDown,
  onPivotDoubleClick,
  onBboxMouseDown,
}: SelectionBoxProps) {
  const left = bbox.x - SELECTION_PADDING;
  const top = bbox.y - SELECTION_PADDING;
  const width = bbox.width + SELECTION_PADDING * 2;
  const height = bbox.height + SELECTION_PADDING * 2;

  const handleX = left + width / 2;
  const handleY = top - HANDLE_OFFSET;

  const handleClass = isSnapping
    ? `${styles.selectionHandle} ${styles.selectionHandleSnapping}`
    : styles.selectionHandle;

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
      <line
        className={styles.selectionConnector}
        x1={handleX}
        y1={top}
        x2={handleX}
        y2={handleY + HANDLE_RADIUS}
      />
      <circle
        className={handleClass}
        cx={handleX}
        cy={handleY}
        r={HANDLE_RADIUS}
        onMouseDown={onHandleMouseDown}
        role="button"
        aria-label="Rotation handle. Drag to rotate selection."
        tabIndex={0}
      />
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
