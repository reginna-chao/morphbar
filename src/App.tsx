import { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import EditorCanvas from '@/components/EditorCanvas';
import ControlsSidebar from '@/components/ControlsSidebar';
import CodePanel from '@/components/CodePanel';
import SegmentedControl from '@/components/ui/SegmentedControl';
import ThemeToggle from '@/components/ThemeToggle';
import { generateCode } from '@/utils/generator';
import type { Mode, Method, LineState, Lines, ClassNameConfig, SizeConfig } from './types';
import '@/styles/global.scss';
import logoLight from '@/assets/images/logomark-light.svg';
import logoDark from '@/assets/images/logomark-dark.svg';

// Initial State (Standard Hamburger -> Cross)
const INITIAL_LINES: Lines = [
  {
    menu: [
      { x: 20, y: 30, type: 'anchor' },
      { x: 80, y: 30, type: 'anchor' },
    ],
    close: [
      { x: 20, y: 20, type: 'anchor' },
      { x: 80, y: 80, type: 'anchor' },
    ],
  },
  {
    menu: [
      { x: 20, y: 50, type: 'anchor' },
      { x: 80, y: 50, type: 'anchor' },
    ],
    close: [
      { x: 50, y: 50, type: 'anchor' },
      { x: 50, y: 50, type: 'anchor' },
    ], // Collapses to center
  },
  {
    menu: [
      { x: 20, y: 70, type: 'anchor' },
      { x: 80, y: 70, type: 'anchor' },
    ],
    close: [
      { x: 20, y: 80, type: 'anchor' },
      { x: 80, y: 20, type: 'anchor' },
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
  const [sizeConfig, setSizeConfig] = useState<SizeConfig>({
    width: 50,
    strokeWidth: 3,
  });

  const handleReset = () => {
    setLines(JSON.parse(JSON.stringify(INITIAL_LINES)));
  };

  const generatedCode = generateCode(lines, method, classNameConfig, sizeConfig);

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <header>
        <div className="header-left">
          <h1 className="header-logo">
            <picture>
              <source media="(prefers-color-scheme: dark)" srcSet={logoDark} />
              <source media="(prefers-color-scheme: light)" srcSet={logoLight} />
              <img alt="Logomark" src={logoLight} width={32} height={32} />
            </picture>
            <span className="strong-text">Morph</span>
            <span>Bar</span>
          </h1>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ThemeToggle />
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
        </div>
      </header>

      <main>
        <EditorCanvas mode={mode} lines={lines} onLinesChange={setLines} onReset={handleReset} />

        {activePanel === 'design' ? (
          <ControlsSidebar
            mode={mode}
            onModeChange={setMode}
            method={method}
            generatedCode={generatedCode}
            lines={lines}
            onLinesChange={setLines}
          />
        ) : (
          <CodePanel
            generatedCode={generatedCode}
            method={method}
            onMethodChange={setMethod}
            classNameConfig={classNameConfig}
            onClassNameChange={setClassNameConfig}
            sizeConfig={sizeConfig}
            onSizeConfigChange={setSizeConfig}
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
