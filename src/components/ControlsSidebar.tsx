import SegmentedControl from './ui/SegmentedControl';
import LineManager from './LineManager';
import type { Mode, Lines } from '../types';
import styles from './ControlsSidebar.module.scss';
import { Menu, X } from 'lucide-react';

interface ControlsSidebarProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  lines: Lines;
  onLinesChange: (lines: Lines) => void;
}

export default function ControlsSidebar({
  mode,
  onModeChange,
  lines,
  onLinesChange,
}: ControlsSidebarProps) {
  return (
    <aside className={styles.controlsSidebar}>
      <div className={styles.controlGroup}>
        <LineManager lines={lines} onLinesChange={onLinesChange} />
      </div>

      <div className={styles.controlGroup}>
        <h2>Edit State</h2>
        <SegmentedControl
          options={[
            { value: 'menu', label: 'Menu (Hamburger)', icon: <Menu /> },
            { value: 'close', label: 'Close (Active)', icon: <X /> },
          ]}
          value={mode}
          onChange={onModeChange}
        />
      </div>
    </aside>
  );
}
