import { useState } from 'react';
import EditorCanvas from '@/components/EditorCanvas';
import ControlsSidebar from '@/components/ControlsSidebar';
import CodePanel from '@/components/CodePanel';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { generateCode } from '@/utils/generator';
import type { Mode, Method, LineState, Lines, ClassNameConfig } from './types';
import '@/styles/global.scss';

// Initial State (Standard Hamburger -> Cross)
const INITIAL_LINES: Lines = [
  {
    menu: [
      { x: 20, y: 30 },
      { x: 80, y: 30 },
    ],
    close: [
      { x: 20, y: 20 },
      { x: 80, y: 80 },
    ],
  },
  {
    menu: [
      { x: 20, y: 50 },
      { x: 80, y: 50 },
    ],
    close: [
      { x: 50, y: 50 },
      { x: 50, y: 50 },
    ], // Collapses to center
  },
  {
    menu: [
      { x: 20, y: 70 },
      { x: 80, y: 70 },
    ],
    close: [
      { x: 20, y: 80 },
      { x: 80, y: 20 },
    ],
  },
];

type PanelType = 'design' | 'code';

function App() {
  const [mode, setMode] = useState<Mode>('menu');
  const [method, setMethod] = useState<Method>('checkbox');
  const [lines, setLines] = useState<LineState[]>(JSON.parse(JSON.stringify(INITIAL_LINES)));
  const [activePanel, setActivePanel] = useState<PanelType>('design');
  const [classNameConfig, setClassNameConfig] = useState<ClassNameConfig>({
    baseClass: 'hamburger-menu',
    activeClass: 'is-active',
  });

  const handleReset = () => {
    setLines(JSON.parse(JSON.stringify(INITIAL_LINES)));
  };

  const generatedCode = generateCode(lines, method, classNameConfig);

  return (
    <>
      <header>
        <div className="header-left">
          <h1>MorphBar</h1>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <SegmentedControl
            options={[
              { value: 'design', label: 'Design' },
              { value: 'code', label: 'Code' },
            ]}
            value={activePanel}
            onChange={setActivePanel}
          />
        </div>

        <a
          href="https://github.com/reginna-chao/morphbar"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          aria-label="View on GitHub"
        >
          <svg height="24" viewBox="0 0 16 16" version="1.1" width="24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            ></path>
          </svg>
        </a>
      </header>

      <main>
        <EditorCanvas mode={mode} lines={lines} onLinesChange={setLines} onReset={handleReset} />

        {activePanel === 'design' ? (
          <ControlsSidebar
            mode={mode}
            onModeChange={setMode}
            method={method}
            generatedCode={generatedCode}
          />
        ) : (
          <CodePanel
            generatedCode={generatedCode}
            method={method}
            onMethodChange={setMethod}
            classNameConfig={classNameConfig}
            onClassNameChange={setClassNameConfig}
          />
        )}
      </main>

      <footer>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Inspired by{' '}
          <a
            href="https://codepen.io/Zaku/pen/ejLNJL"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit' }}
          >
            Zaku's Pen
          </a>
        </div>
      </footer>
    </>
  );
}

export default App;
