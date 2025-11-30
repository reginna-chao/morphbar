import { Plus, Trash2, ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  const [activeSwapMenu, setActiveSwapMenu] = useState<number | null>(null);

  // Close swap menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.swapContainer}`)) {
        setActiveSwapMenu(null);
      }
    };

    if (activeSwapMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeSwapMenu]);
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

  const handleReverseLine = (index: number) => {
    const newLines = JSON.parse(JSON.stringify(lines));
    // Reverse both menu and close states
    newLines[index].menu.reverse();
    newLines[index].close.reverse();
    onLinesChange(newLines);
  };

  const handleSwapLines = (index1: number, index2: number) => {
    const newLines = JSON.parse(JSON.stringify(lines));
    // Only swap menu state, keep close state in original position
    const tempMenu = newLines[index1].menu;
    newLines[index1].menu = newLines[index2].menu;
    newLines[index2].menu = tempMenu;
    onLinesChange(newLines);
    setActiveSwapMenu(null);
  };

  const toggleSwapMenu = (index: number) => {
    setActiveSwapMenu(activeSwapMenu === index ? null : index);
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
          aria-label="Add new line"
          data-tooltip-id="app-tooltip"
          data-tooltip-content="Add new line"
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

              <div className={styles.lineActions}>
                <div className={styles.swapContainer}>
                  <Button
                    onClick={() => toggleSwapMenu(index)}
                    variant="ghost"
                    size="small"
                    aria-label="Switch line position"
                    data-tooltip-id="app-tooltip"
                    data-tooltip-content="Switch line position"
                    disabled={lines.length <= 1}
                  >
                    <ArrowUpDown size={16} />
                  </Button>
                  {activeSwapMenu === index && lines.length > 1 && (
                    <div className={styles.swapMenu}>
                      {lines.map((_, targetIndex) => {
                        if (targetIndex === index) return null;
                        const targetColor = getLineColor(targetIndex, lines[targetIndex].color);
                        return (
                          <button
                            key={targetIndex}
                            className={styles.swapMenuItem}
                            onClick={() => handleSwapLines(index, targetIndex)}
                          >
                            <div
                              className={styles.swapColorIndicator}
                              style={{ backgroundColor: targetColor }}
                            />
                            <span>Line {targetIndex + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => handleReverseLine(index)}
                  variant="ghost"
                  size="small"
                  aria-label="Reverse line direction"
                  data-tooltip-id="app-tooltip"
                  data-tooltip-content="Reverse line direction"
                >
                  <ArrowLeftRight size={16} />
                </Button>
                <Button
                  onClick={() => handleDeleteLine(index)}
                  disabled={lines.length <= MIN_LINES}
                  variant="ghost"
                  size="small"
                  aria-label={lines.length <= MIN_LINES ? 'Cannot delete last line' : 'Delete line'}
                  data-tooltip-id="app-tooltip"
                  data-tooltip-content={
                    lines.length <= MIN_LINES ? 'Cannot delete last line' : 'Delete line'
                  }
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
