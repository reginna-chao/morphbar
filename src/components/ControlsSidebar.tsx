import { useCallback } from 'react';
import SegmentedControl from './ui/SegmentedControl';
import LineManager from './LineManager';
import MirrorManager from './MirrorManager';
import type { Mode, Lines, MirrorGroup, SizeConfig } from '@/types';
import styles from './ControlsSidebar.module.scss';
import { Menu, X } from 'lucide-react';

interface ControlsSidebarProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  lines: Lines;
  onLinesChange: (lines: Lines) => void;
  mirrorGroups: MirrorGroup[];
  onMirrorGroupsChange: (groups: MirrorGroup[]) => void;
  sizeConfig: SizeConfig;
  onSizeConfigChange: (config: SizeConfig) => void;
}

export default function ControlsSidebar({
  mode,
  onModeChange,
  lines,
  onLinesChange,
  mirrorGroups,
  onMirrorGroupsChange,
  sizeConfig,
  onSizeConfigChange,
}: ControlsSidebarProps) {
  const handleHorizontalShiftChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val)) {
        onSizeConfigChange({ ...sizeConfig, horizontalShift: val });
      }
    },
    [sizeConfig, onSizeConfigChange]
  );

  return (
    <aside className={styles.controlsSidebar}>
      <div className={styles.controlGroup}>
        <LineManager lines={lines} onLinesChange={onLinesChange} />
      </div>

      <div className={styles.controlGroup}>
        <MirrorManager
          lines={lines}
          mirrorGroups={mirrorGroups}
          onMirrorGroupsChange={onMirrorGroupsChange}
        />
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

      <div className={styles.controlGroup}>
        <h2>Animation Settings</h2>
        <div className={styles.inputGroup}>
          <label htmlFor="horizontalShift">Horizontal Shift</label>
          <div className={styles.sliderGroup}>
            <input
              id="horizontalShift"
              type="range"
              min="-200"
              max="200"
              step="1"
              value={sizeConfig.horizontalShift}
              onChange={handleHorizontalShiftChange}
              className={styles.slider}
            />
            <input
              type="number"
              min="-200"
              max="200"
              value={sizeConfig.horizontalShift}
              onChange={handleHorizontalShiftChange}
              aria-label="Horizontal shift value"
              className={styles.numberInput}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
