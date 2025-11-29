import { Plus, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import { createDefaultLine, getLineColor } from '@/utils/colors';
import type { Lines } from '../types';
import styles from './LineManager.module.scss';

interface LineManagerProps {
  lines: Lines;
  onLinesChange: (lines: Lines) => void;
}

const MAX_LINES = 10;
const MIN_LINES = 1;

export default function LineManager({ lines, onLinesChange }: LineManagerProps) {
  const handleAddLine = () => {
    if (lines.length >= MAX_LINES) return;

    const newLine = createDefaultLine();
    onLinesChange([...lines, newLine]);
  };

  const handleDeleteLine = (index: number) => {
    if (lines.length <= MIN_LINES) return;

    const newLines = lines.filter((_, i) => i !== index);
    onLinesChange(newLines);
  };

  return (
    <div className={styles.lineManager}>
      <div className={styles.header}>
        <h3>
          Lines ({lines.length}/{MAX_LINES})
        </h3>
        <Button
          onClick={handleAddLine}
          disabled={lines.length >= MAX_LINES}
          size="small"
          title="Add new line"
        >
          <Plus size={16} />
        </Button>
      </div>

      <div className={styles.linesList}>
        {lines.map((line, index) => {
          const lineColor = getLineColor(index, line.color);

          return (
            <div key={index} className={styles.lineItem}>
              <div className={styles.lineInfo}>
                <div className={styles.colorIndicator} style={{ backgroundColor: lineColor }} />
                <span className={styles.lineName}>Line {index + 1}</span>
                <span className={styles.pointCount}>
                  {line.menu.filter((p) => p.type === 'anchor').length} points
                </span>
              </div>

              <Button
                onClick={() => handleDeleteLine(index)}
                disabled={lines.length <= MIN_LINES}
                variant="ghost"
                size="small"
                title={lines.length <= MIN_LINES ? 'Cannot delete last line' : 'Delete line'}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
