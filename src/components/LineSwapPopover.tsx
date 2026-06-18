import { useCallback, useEffect, useRef } from 'react';
import { ArrowUpDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useOutsideClick } from '@/hooks/useOutsideClick';
import styles from './LineManager.module.scss';

interface SwapTarget {
  id: string;
  index: number;
  color: string;
}

interface LineSwapPopoverProps {
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  targets: SwapTarget[];
  onSwap: (targetIndex: number) => void;
}

export default function LineSwapPopover({
  open,
  disabled,
  onToggle,
  targets,
  onSwap,
}: LineSwapPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  useOutsideClick(containerRef, onToggle, open);

  useEffect(() => {
    if (!open && wasOpenRef.current) {
      containerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle]
  );

  return (
    <div className={styles.swapContainer} ref={containerRef} onKeyDown={handleKeyDown}>
      <Button
        onClick={onToggle}
        variant="ghost"
        size="small"
        aria-label="Switch line position"
        data-tooltip-id="app-tooltip"
        data-tooltip-content="Switch line position"
        disabled={disabled}
      >
        <ArrowUpDown size={16} />
      </Button>
      {open && !disabled && targets.length > 0 && (
        <div className={styles.swapMenu}>
          {targets.map((target) => (
            <button
              key={target.id}
              type="button"
              className={styles.swapMenuItem}
              onClick={() => onSwap(target.index)}
            >
              <div
                className={styles.swapColorIndicator}
                style={{ backgroundColor: target.color }}
              />
              <span>Line {target.index + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
