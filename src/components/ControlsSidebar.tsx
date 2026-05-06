import { useCallback } from 'react';
import SegmentedControl from './ui/SegmentedControl';
import LineManager from './LineManager';
import MirrorManager from './MirrorManager';
import StylePanel from './StylePanel';
import GlobalRotationButtons from './GlobalRotationButtons';
import type { Mode, Lines, MirrorGroup, SizeConfig, StyleConfig, TemplateResult } from '@/types';
import styles from './ControlsSidebar.module.scss';
import { Menu, X } from 'lucide-react';

interface ControlsSidebarProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  lines: Lines;
  onLinesChange: (lines: Lines) => void;
  // Metadata-only updater (color/strokeWidth). Skips mirror-sync.
  onLinesMetaChange: (lines: Lines) => void;
  onLoadTemplate: (result: TemplateResult) => void;
  mirrorGroups: MirrorGroup[];
  onMirrorGroupsChange: (groups: MirrorGroup[]) => void;
  sizeConfig: SizeConfig;
  onSizeConfigChange: (config: SizeConfig) => void;
  // Pushes the current sizeConfig (horizontalShift slice) onto the history
  // stack — called on slider release / number input blur.
  onSizeConfigCommit: () => void;
  styleConfig: StyleConfig;
  onStyleConfigChange: (config: StyleConfig) => void;
  // Pushes the current styleConfig onto the history stack — called after
  // discrete style changes (toggles) and on color/range pointer release.
  onStyleConfigCommit: () => void;
  onRotateAll: (deg: number) => void;
}

export default function ControlsSidebar({
  mode,
  onModeChange,
  lines,
  onLinesChange,
  onLinesMetaChange,
  onLoadTemplate,
  mirrorGroups,
  onMirrorGroupsChange,
  sizeConfig,
  onSizeConfigChange,
  onSizeConfigCommit,
  styleConfig,
  onStyleConfigChange,
  onStyleConfigCommit,
  onRotateAll,
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
        <LineManager lines={lines} onLinesChange={onLinesChange} onLoadTemplate={onLoadTemplate} />
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
        <StylePanel
          styleConfig={styleConfig}
          onStyleConfigChange={onStyleConfigChange}
          onStyleConfigCommit={onStyleConfigCommit}
          lines={lines}
          onLinesChange={onLinesMetaChange}
          onLinesCommit={onLinesChange}
        />
      </div>

      <div className={styles.controlGroup}>
        <h2>Animation Settings</h2>

        <div
          className={styles.inputGroup}
          role="group"
          aria-label="Rotate all lines around canvas center"
        >
          <label aria-hidden="true">Rotate All</label>
          <GlobalRotationButtons onRotate={onRotateAll} />
        </div>

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
              onPointerUp={onSizeConfigCommit}
              onKeyUp={onSizeConfigCommit}
              className={styles.slider}
            />
            <input
              type="number"
              min="-200"
              max="200"
              value={sizeConfig.horizontalShift}
              onChange={handleHorizontalShiftChange}
              onBlur={onSizeConfigCommit}
              aria-label="Horizontal shift value"
              className={styles.numberInput}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
