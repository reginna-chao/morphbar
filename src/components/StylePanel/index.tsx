import { useCallback, type ReactElement } from 'react';
import StrokeSection from './StrokeSection';
import BackgroundSection from './BackgroundSection';
import BorderSection from './BorderSection';
import type { Lines, LineStyleOverride, StyleConfig } from '@/types';
import styles from '@/components/StylePanel/StylePanel.module.scss';

interface StylePanelProps {
  styleConfig: StyleConfig;
  onStyleConfigChange: (config: StyleConfig) => void;
  onStyleConfigCommit: () => void;
  lines: Lines;
  onLinesChange: (lines: Lines) => void;
  // Commits the supplied lines to history (mirror-aware path).
  onLinesCommit: (lines: Lines) => void;
}

export default function StylePanel({
  styleConfig,
  onStyleConfigChange,
  onStyleConfigCommit,
  lines,
  onLinesChange,
  onLinesCommit,
}: StylePanelProps): ReactElement {
  const update = useCallback(
    (patch: Partial<StyleConfig>) => onStyleConfigChange({ ...styleConfig, ...patch }),
    [styleConfig, onStyleConfigChange]
  );

  const updateLine = useCallback(
    (index: number, patch: Partial<LineStyleOverride>) => {
      const next = lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
      onLinesChange(next);
    },
    [lines, onLinesChange]
  );

  const commitLine = useCallback(
    (index: number, patch: Partial<LineStyleOverride>) => {
      const next = lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
      onLinesCommit(next);
    },
    [lines, onLinesCommit]
  );

  return (
    <div className={styles.stylePanel}>
      <h2>Style</h2>

      <StrokeSection
        styleConfig={styleConfig}
        onStyleConfigChange={onStyleConfigChange}
        onStyleConfigCommit={onStyleConfigCommit}
        update={update}
        lines={lines}
        onLinesChange={onLinesChange}
        updateLine={updateLine}
        commitLine={commitLine}
      />

      <BackgroundSection
        styleConfig={styleConfig}
        update={update}
        onStyleConfigCommit={onStyleConfigCommit}
      />

      <BorderSection
        styleConfig={styleConfig}
        update={update}
        onStyleConfigCommit={onStyleConfigCommit}
      />
    </div>
  );
}
