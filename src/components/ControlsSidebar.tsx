import Preview from './Preview';
import type { Mode, Method, GeneratedCode } from '../types';

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
    <aside className="controls-sidebar">
      <div className="control-group">
        <h2>Edit State</h2>
        <div className="btn-group">
          <button
            className={`btn-toggle ${mode === 'menu' ? 'active' : ''}`}
            onClick={() => onModeChange('menu')}
          >
            Menu (Hamburger)
          </button>
          <button
            className={`btn-toggle ${mode === 'close' ? 'active' : ''}`}
            onClick={() => onModeChange('close')}
          >
            Close (Active)
          </button>
        </div>
      </div>

      <div className="control-group">
        <h2>Live Preview</h2>
        <Preview html={generatedCode.html} css={generatedCode.css} method={method} />
        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Click to animate
        </div>
      </div>
    </aside>
  );
}
