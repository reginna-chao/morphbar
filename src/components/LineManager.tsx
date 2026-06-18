import { Plus, LayoutTemplate } from 'lucide-react';
import { useCallback, useState } from 'react';
import Button from '@/components/ui/Button';
import TemplateModal from '@/components/TemplateModal';
import LineRow from '@/components/LineRow';
import { createDefaultLine, getLineColor } from '@/utils/colors';
import type { Lines, TemplateResult } from '@/types';
import styles from './LineManager.module.scss';

interface LineManagerProps {
  lines: Lines;
  onLinesChange: (lines: Lines) => void;
  onLoadTemplate: (result: TemplateResult) => void;
}

type ActiveMenu = { kind: 'swap'; index: number } | null;

const MAX_LINES = 10;
const MIN_LINES = 1;

export default function LineManager({ lines, onLinesChange, onLoadTemplate }: LineManagerProps) {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const handleAddLine = useCallback(() => {
    if (lines.length >= MAX_LINES) return;
    onLinesChange([...lines, createDefaultLine()]);
  }, [lines, onLinesChange]);

  const handleDeleteLine = useCallback(
    (index: number) => {
      if (lines.length <= MIN_LINES) return;
      onLinesChange(lines.filter((_, i) => i !== index));
    },
    [lines, onLinesChange]
  );

  const handleReverseLine = useCallback(
    (index: number) => {
      const next = lines.map((l, i) =>
        i === index ? { ...l, menu: [...l.menu].reverse(), close: [...l.close].reverse() } : l
      );
      onLinesChange(next);
    },
    [lines, onLinesChange]
  );

  const handleSwapLines = useCallback(
    (index1: number, index2: number) => {
      const menu1 = lines[index1].menu;
      const menu2 = lines[index2].menu;
      const next = lines.map((l, i) => {
        if (i === index1) return { ...l, menu: menu2 };
        if (i === index2) return { ...l, menu: menu1 };
        return l;
      });
      onLinesChange(next);
      setActiveMenu(null);
    },
    [lines, onLinesChange]
  );

  const toggleSwapMenu = useCallback((index: number) => {
    setActiveMenu((current) =>
      current?.kind === 'swap' && current.index === index ? null : { kind: 'swap', index }
    );
  }, []);

  return (
    <div className={styles.lineManager}>
      <div className={styles.header}>
        <h3>
          Lines ({lines.length}/{MAX_LINES})
        </h3>
        <div className={styles.headerActions}>
          <Button
            onClick={() => setTemplateModalOpen(true)}
            size="small"
            variant="ghost"
            aria-label="Load template"
            data-tooltip-id="app-tooltip"
            data-tooltip-content="Load template (replaces all lines)"
          >
            <LayoutTemplate size={16} />
          </Button>
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
      </div>

      <TemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onApply={onLoadTemplate}
      />

      <div className={styles.linesList}>
        {lines.map((line, index) => {
          const swapTargets = lines
            .map((l, i) => ({ id: l.id, index: i, color: getLineColor(i, l.color) }))
            .filter((t) => t.index !== index);

          return (
            <LineRow
              key={line.id}
              line={line}
              index={index}
              totalLines={lines.length}
              minLines={MIN_LINES}
              swapTargets={swapTargets}
              swapOpen={activeMenu?.kind === 'swap' && activeMenu.index === index}
              onToggleSwap={() => toggleSwapMenu(index)}
              onSwap={(targetIndex) => handleSwapLines(index, targetIndex)}
              onReverse={() => handleReverseLine(index)}
              onDelete={() => handleDeleteLine(index)}
            />
          );
        })}
      </div>
    </div>
  );
}
