import { RotateCcw, RotateCw, Repeat } from 'lucide-react';
import styles from './GlobalRotationButtons.module.scss';

interface GlobalRotationButtonsProps {
  onRotate: (deg: number) => void;
}

const PRESETS = [
  {
    deg: -90,
    icon: RotateCcw,
    label: 'Rotate all -90 around canvas center',
    tooltip: 'Rotate all -90',
  },
  {
    deg: 90,
    icon: RotateCw,
    label: 'Rotate all +90 around canvas center',
    tooltip: 'Rotate all +90',
  },
  {
    deg: 180,
    icon: Repeat,
    label: 'Rotate all 180 around canvas center',
    tooltip: 'Rotate all 180',
  },
] as const;

export default function GlobalRotationButtons({
  onRotate,
}: GlobalRotationButtonsProps): React.ReactElement {
  return (
    <div className={styles.row}>
      {PRESETS.map(({ deg, icon: Icon, label, tooltip }) => (
        <button
          key={deg}
          type="button"
          className={styles.button}
          onClick={() => onRotate(deg)}
          aria-label={label}
          data-tooltip-id="app-tooltip"
          data-tooltip-content={tooltip}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
