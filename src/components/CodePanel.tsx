import { useRef } from 'react';
import Button from './ui/Button';
import SegmentedControl from './ui/SegmentedControl';
import type { GeneratedCode, Method } from '../types';
import styles from './CodePanel.module.scss';

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
    <div className={styles.codePanel}>
      <div className={styles.codePanelHeader}>
        <h2>Generated Code</h2>
        <Button variant="primary" id="btn-copy" onClick={handleCopy}>
          Copy Code
        </Button>
      </div>

      <div className={styles.codePanelContent}>
        <div className={styles.controlGroup}>
          <h2>Implementation Method</h2>
          <SegmentedControl
            options={[
              { value: 'checkbox', label: 'Checkbox (CSS)' },
              { value: 'class', label: 'Class + JS' },
            ]}
            value={method}
            onChange={onMethodChange}
          />
        </div>

        <div className={styles.codeOutput}>
          <code ref={codeDisplayRef} id="code-display">
            {generatedCode.fullCode}
          </code>
        </div>
      </div>
    </div>
  );
}
