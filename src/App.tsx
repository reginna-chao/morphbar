import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Tooltip } from 'react-tooltip';
import EditorCanvas from '@/components/EditorCanvas';
import ControlsSidebar from '@/components/ControlsSidebar';
import CodePanel from '@/components/CodePanel';
import SegmentedControl from '@/components/ui/SegmentedControl';
import ThemeToggle from '@/components/ThemeToggle';
import UndoRedoControls from '@/components/UndoRedoControls';
import { useDesignHistory } from '@/hooks/useDesignHistory';
import { generateCode } from '@/utils/generator';
import { rotateLinesAroundPivot } from '@/utils/geometry';
import { toastContainerConfig, toastOptions } from '@/config/toast';
import type {
  Mode,
  Method,
  Lines,
  ClassNameConfig,
  SizeConfig,
  StyleConfig,
  LineIndex,
  PreviewThemeConfig,
  TemplateResult,
} from '@/types';
import '@/styles/global.scss';
import logoLight from '@/assets/images/logomark-light.svg';
import logoDark from '@/assets/images/logomark-dark.svg';
import { Code, SplinePointer } from 'lucide-react';
import FloatingPreview from '@/components/FloatingPreview';

// Initial State (Standard Hamburger -> Cross)
const INITIAL_LINES: Lines = [
  {
    id: 'line-init-1',
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
    id: 'line-init-2',
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
    id: 'line-init-3',
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

const INITIAL_STYLE_CONFIG: StyleConfig = {
  strokeColor: '#ffffff',
  strokeWidth: 3,
  perLineColor: false,
  perLineWidth: false,
  backgroundColor: '#ffffff',
  backgroundTransparent: true,
  borderWidth: 0,
  borderColor: '#000000',
  borderRadius: 0,
};

type PanelType = 'design' | 'code';

const INTERACTION_BODY_CLASSES = [
  'is-rotating',
  'is-translating',
  'is-scaling-nwse',
  'is-scaling-nesw',
  'is-scaling-ns',
  'is-scaling-ew',
  'is-point-dragging',
  'is-marqueeing',
];

function isInteractionActive(): boolean {
  const cls = document.body.classList;
  for (const name of INTERACTION_BODY_CLASSES) {
    if (cls.contains(name)) return true;
  }
  return false;
}

function App() {
  const [mode, setMode] = useState<Mode>('menu');
  const [method, setMethod] = useState<Method>('checkbox');
  const [activePanel, setActivePanel] = useState<PanelType>('design');
  const [classNameConfig, setClassNameConfig] = useState<ClassNameConfig>({
    baseClass: 'hamburger-menu',
    activeClass: 'is-active',
  });
  const [renderSize, setRenderSize] = useState<{ width: number }>({ width: 50 });
  const [previewThemeConfig, setPreviewThemeConfig] = useState<PreviewThemeConfig>({
    theme: 'dark',
    customColor: '#888888',
  });
  const [rotateCurrentModeOnly, setRotateCurrentModeOnly] = useState(false);

  const { history, handlers } = useDesignHistory({
    lines: structuredClone(INITIAL_LINES),
    mirrorGroups: [],
    styleConfig: { ...INITIAL_STYLE_CONFIG },
    horizontalShift: 0,
  });
  const { lines, mirrorGroups, styleConfig, horizontalShift } = history.state;

  const sizeConfig: SizeConfig = useMemo(
    () => ({ width: renderSize.width, horizontalShift }),
    [renderSize.width, horizontalShift]
  );

  const handleSizeConfigChange = useCallback(
    (next: SizeConfig) => {
      if (next.width !== renderSize.width) {
        setRenderSize({ width: next.width });
      }
      if (next.horizontalShift !== horizontalShift) {
        handlers.setHorizontalShift(next.horizontalShift);
      }
    },
    [handlers, renderSize.width, horizontalShift]
  );

  const handleReset = useCallback(() => {
    handlers.reset(INITIAL_LINES);
    toast.success('Reset successful', toastOptions.success);
  }, [handlers]);

  const handleLoadTemplate = useCallback(
    (result: TemplateResult) => {
      handlers.loadTemplate(result);
      toast.success('Template applied', toastOptions.success);
    },
    [handlers]
  );

  // Global Undo/Redo hotkeys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target?.isContentEditable ?? false)
      )
        return;
      if (!e.ctrlKey && !e.metaKey) return;
      // Block undo/redo while a drag/marquee/transform is in flight — origin
      // snapshots inside the interaction would desync from the rolled-back
      // state and corrupt subsequent moves.
      if (isInteractionActive()) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history]);

  // Map of target line index → source line index (for disabling targets on canvas)
  const mirrorTargetMap = useMemo(() => {
    const map = new Map<LineIndex, LineIndex>();
    for (const group of mirrorGroups) {
      for (const target of group.targetLines) {
        map.set(target, group.sourceLine);
      }
    }
    return map;
  }, [mirrorGroups]);

  // Source line indices used by mirror groups (rotated lines that are sources
  // need both menu+close rotated together so the mirrored target stays in sync).
  const sourceIndices = useMemo(
    () => new Set(mirrorGroups.map((g) => g.sourceLine)),
    [mirrorGroups]
  );

  const generatedCode = useMemo(
    () => generateCode(lines, method, classNameConfig, sizeConfig, styleConfig),
    [lines, method, classNameConfig, sizeConfig, styleConfig]
  );

  const handleRotateAll = useCallback(
    (deg: number) => {
      if (isInteractionActive()) return;
      if (lines.length === 0) return;
      if (!Number.isFinite(deg) || deg % 360 === 0) return;
      const allIndices = new Set<number>();
      for (let i = 0; i < lines.length; i++) {
        allIndices.add(i);
      }
      // When rotateCurrentModeOnly: pass an empty source set so even real mirror
      // sources are treated as non-sources by rotateLinesAroundPivot — only the
      // active mode of each source rotates. The inactive mode (e.g. close while
      // editing menu) is preserved at the target because applyMirrorSync
      // re-derives target.close from the untouched source.close. The active
      // mode stays geometrically correct across the mirror because rotation
      // around (50, 50) commutes with mirror axes through (50, 50).
      const effectiveSources = rotateCurrentModeOnly ? new Set<number>() : sourceIndices;
      const next = rotateLinesAroundPivot(lines, allIndices, effectiveSources, mode, deg, {
        x: 50,
        y: 50,
      });
      handlers.commitLines(next);
    },
    [lines, sourceIndices, mode, handlers, rotateCurrentModeOnly]
  );

  return (
    <>
      <ToastContainer {...toastContainerConfig} />
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
              { value: 'design', label: 'Design', icon: <SplinePointer /> },
              { value: 'code', label: 'Code', icon: <Code /> },
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
            aria-label="View source code on GitHub"
            data-tooltip-id="app-tooltip"
            data-tooltip-content="View source code on GitHub"
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
        <div style={{ position: 'relative', height: '100%' }}>
          <EditorCanvas
            mode={mode}
            lines={lines}
            onLinesChange={handlers.setLines}
            onCommit={handlers.commit}
            onReset={handleReset}
            mirrorTargetMap={mirrorTargetMap}
            sourceIndices={sourceIndices}
          />

          <UndoRedoControls
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={history.undo}
            onRedo={history.redo}
          />

          <FloatingPreview
            html={generatedCode.html}
            css={generatedCode.css}
            method={method}
            classNameConfig={classNameConfig}
            themeConfig={previewThemeConfig}
            onThemeConfigChange={setPreviewThemeConfig}
          />
        </div>

        {activePanel === 'design' ? (
          <ControlsSidebar
            mode={mode}
            onModeChange={setMode}
            lines={lines}
            onLinesChange={handlers.commitLines}
            onLinesMetaChange={handlers.setLinesMeta}
            onLoadTemplate={handleLoadTemplate}
            mirrorGroups={mirrorGroups}
            onMirrorGroupsChange={handlers.commitMirrorGroups}
            sizeConfig={sizeConfig}
            onSizeConfigChange={handleSizeConfigChange}
            onSizeConfigCommit={handlers.commit}
            styleConfig={styleConfig}
            onStyleConfigChange={handlers.setStyleConfig}
            onStyleConfigCommit={handlers.commit}
            onRotateAll={handleRotateAll}
            rotateCurrentModeOnly={rotateCurrentModeOnly}
            onRotateCurrentModeOnlyChange={setRotateCurrentModeOnly}
          />
        ) : (
          <CodePanel
            generatedCode={generatedCode}
            method={method}
            onMethodChange={setMethod}
            classNameConfig={classNameConfig}
            onClassNameChange={setClassNameConfig}
            sizeConfig={sizeConfig}
            onSizeConfigChange={handleSizeConfigChange}
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

      <Tooltip id="app-tooltip" place="top" />
    </>
  );
}

export default App;
