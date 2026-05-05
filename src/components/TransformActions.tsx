import { useState } from 'react';
import { RotateCcw, RotateCw, Repeat } from 'lucide-react';
import type { Tool } from '@/types';
import styles from './TransformActions.module.scss';

interface TransformActionsProps {
  activeTool: Tool;
  selectedCount: number;
  onRotate: (deg: number) => void;
  disabled?: boolean;
}

const ROTATE_PRESETS = [
  { deg: -90, icon: RotateCcw, label: 'Rotate counterclockwise 90 degrees', tooltip: 'Rotate -90' },
  { deg: 90, icon: RotateCw, label: 'Rotate clockwise 90 degrees', tooltip: 'Rotate +90' },
  { deg: 180, icon: Repeat, label: 'Rotate 180 degrees', tooltip: 'Rotate 180' },
] as const;

function parseAngle(input: string): number | null {
  const trimmed = input.trim().replace(',', '.');
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const normalized = parsed % 360;
  if (normalized === 0 || (parsed !== 0 && Math.abs(normalized) < 1e-9)) return null;
  return parsed;
}

export default function TransformActions({
  activeTool,
  selectedCount,
  onRotate,
  disabled = false,
}: TransformActionsProps): React.ReactElement | null {
  const [angleStr, setAngleStr] = useState<string>('');

  const visible = activeTool === 'transform' && selectedCount > 0;
  if (!visible) return null;

  const apply = (): void => {
    const parsed = parseAngle(angleStr);
    if (parsed === null) return;
    onRotate(parsed);
    setAngleStr('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      apply();
    }
  };

  const isApplyDisabled = parseAngle(angleStr) === null;

  return (
    <div className={styles.panel}>
      {ROTATE_PRESETS.map(({ deg, icon: Icon, label, tooltip }) => (
        <button
          key={deg}
          type="button"
          className={styles.actionButton}
          onClick={() => onRotate(deg)}
          disabled={disabled}
          aria-label={label}
          data-tooltip-id="app-tooltip"
          data-tooltip-content={tooltip}
        >
          <Icon size={16} />
        </button>
      ))}

      <div className={styles.divider} aria-hidden="true" />

      <input
        type="text"
        inputMode="decimal"
        className={styles.angleInput}
        placeholder="0"
        value={angleStr}
        onChange={(e) => setAngleStr(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-label="Custom rotation angle in degrees"
        autoComplete="off"
      />
      <span className={styles.degSymbol} aria-hidden="true">
        °
      </span>
      <button
        type="button"
        className={styles.applyButton}
        onClick={apply}
        disabled={disabled || isApplyDisabled}
        aria-label="Apply custom rotation"
      >
        Apply
      </button>
    </div>
  );
}
