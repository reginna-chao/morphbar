import Preview from './Preview';
import SegmentedControl from './ui/SegmentedControl';
import type { Mode, Method, GeneratedCode } from '../types';
import styles from './ControlsSidebar.module.scss';

interface ControlsSidebarProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  method: Method;
  generatedCode: GeneratedCode;
}

export default function ControlsSidebar({
  mode,
  onModeChange,
  method,
  generatedCode,
}: ControlsSidebarProps) {
  return (
    <aside className={styles.controlsSidebar}>
      <div className={styles.controlGroup}>
        <h2>Edit State</h2>
        <SegmentedControl
          options={[
            { value: 'menu', label: 'Menu (Hamburger)' },
            { value: 'close', label: 'Close (Active)' },
          ]}
          value={mode}
          onChange={onModeChange}
        />
      </div>

      <div className={styles.controlGroup}>
        <h2>Live Preview</h2>
        <Preview html={generatedCode.html} css={generatedCode.css} method={method} />
        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Click to animate
        </div>
      </div>
    </aside>
  );
}
