import { useRef } from 'react';
import Button from './ui/Button';
import SegmentedControl from './ui/SegmentedControl';
import type { GeneratedCode, Method, ClassNameConfig } from '../types';
import styles from './CodePanel.module.scss';

interface CodePanelProps {
  generatedCode: GeneratedCode;
  method: Method;
  onMethodChange: (method: Method) => void;
  classNameConfig: ClassNameConfig;
  onClassNameChange: (config: ClassNameConfig) => void;
}

export default function CodePanel({
  generatedCode,
  method,
  onMethodChange,
  classNameConfig,
  onClassNameChange,
}: CodePanelProps) {
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

        <div className={styles.controlGroup}>
          <h2>Class Names</h2>
          <div className={styles.inputGroup}>
            <label htmlFor="baseClass">Base Class</label>
            <input
              id="baseClass"
              type="text"
              value={classNameConfig.baseClass}
              onChange={(e) => onClassNameChange({ ...classNameConfig, baseClass: e.target.value })}
              className={styles.input}
              placeholder="hamburger-menu"
            />
          </div>

          {method === 'class' && (
            <div className={styles.inputGroup}>
              <label htmlFor="activeClass">Active Class</label>
              <input
                id="activeClass"
                type="text"
                value={classNameConfig.activeClass}
                onChange={(e) =>
                  onClassNameChange({ ...classNameConfig, activeClass: e.target.value })
                }
                className={styles.input}
                placeholder="is-active"
              />
            </div>
          )}
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
