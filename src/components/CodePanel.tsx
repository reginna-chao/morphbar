import { useRef } from 'react';
import type { GeneratedCode, Method } from '../types';

interface CodePanelProps {
  generatedCode: GeneratedCode;
  method: Method;
  onMethodChange: (method: Method) => void;
}

export default function CodePanel({ generatedCode, method, onMethodChange }: CodePanelProps) {
  const codeDisplayRef = useRef<HTMLElement>(null);

  const handleCopy = () => {
    const codeDisplay = codeDisplayRef.current;
    if (!codeDisplay) return;

    navigator.clipboard.writeText(codeDisplay.textContent || '').then(() => {
      const btn = document.getElementById('btn-copy');
      if (!btn) return;

      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    });
  };

  return (
    <div className="code-panel">
      <div className="code-panel-header">
        <h2>Generated Code</h2>
        <button className="btn-copy" id="btn-copy" onClick={handleCopy}>
          Copy Code
        </button>
      </div>

      <div className="code-panel-content">
        <div className="control-group">
          <h2>Implementation Method</h2>
          <div className="btn-group">
            <button
              className={`btn-toggle ${method === 'checkbox' ? 'active' : ''}`}
              onClick={() => onMethodChange('checkbox')}
            >
              Checkbox (CSS)
            </button>
            <button
              className={`btn-toggle ${method === 'class' ? 'active' : ''}`}
              onClick={() => onMethodChange('class')}
            >
              Class + JS
            </button>
          </div>
        </div>

        <div className="code-output">
          <code ref={codeDisplayRef} id="code-display">
            {generatedCode.fullCode}
          </code>
        </div>
      </div>
    </div>
  );
}
