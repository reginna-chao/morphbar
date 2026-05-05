import { ArrowLeftRight, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import LineSwapPopover from '@/components/LineSwapPopover';
import { getLineColor } from '@/utils/colors';
import type { LineState } from '@/types';
import styles from './LineManager.module.scss';

interface SwapTarget {
  id: string;
  index: number;
  color: string;
}

interface LineRowProps {
  line: LineState;
  index: number;
  totalLines: number;
  minLines: number;
  swapTargets: SwapTarget[];
  swapOpen: boolean;
  onToggleSwap: () => void;
  onSwap: (targetIndex: number) => void;
  onReverse: () => void;
  onDelete: () => void;
}

export default function LineRow({
  line,
  index,
  totalLines,
  minLines,
  swapTargets,
  swapOpen,
  onToggleSwap,
  onSwap,
  onReverse,
  onDelete,
}: LineRowProps) {
  const lineColor = getLineColor(index, line.color);
  const canDelete = totalLines > minLines;

  return (
    <div className={styles.lineItem}>
      <div className={styles.lineInfo}>
        <div className={styles.colorIndicator} style={{ backgroundColor: lineColor }} />
        <span className={styles.lineName}>Line {index + 1}</span>
        <span className={styles.pointCount}>
          {line.menu.filter((p) => p.type === 'anchor').length} points
        </span>
      </div>

      <div className={styles.lineActions}>
        <LineSwapPopover
          open={swapOpen}
          disabled={totalLines <= 1}
          onToggle={onToggleSwap}
          targets={swapTargets}
          onSwap={onSwap}
        />
        <Button
          onClick={onReverse}
          variant="ghost"
          size="small"
          aria-label="Reverse line direction"
          data-tooltip-id="app-tooltip"
          data-tooltip-content="Reverse line direction"
        >
          <ArrowLeftRight size={16} />
        </Button>
        <Button
          onClick={onDelete}
          disabled={!canDelete}
          variant="ghost"
          size="small"
          aria-label={canDelete ? 'Delete line' : 'Cannot delete last line'}
          data-tooltip-id="app-tooltip"
          data-tooltip-content={canDelete ? 'Delete line' : 'Cannot delete last line'}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}
