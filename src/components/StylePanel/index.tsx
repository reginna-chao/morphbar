import { useCallback, type ReactElement } from 'react';
import StrokeSection from './StrokeSection';
import BackgroundSection from './BackgroundSection';
import BorderSection from './BorderSection';
import type { Lines, LineStyleOverride, StyleConfig } from '@/types';
import styles from '@/components/StylePanel/StylePanel.module.scss';

interface StylePanelProps {
  styleConfig: StyleConfig;
  onStyleConfigChange: (config: StyleConfig) => void;
  lines: Lines;
  onLinesChange: (lines: Lines) => void;
}

export default function StylePanel({
  styleConfig,
  onStyleConfigChange,
  lines,
  onLinesChange,
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

  return (
    <div className={styles.stylePanel}>
      <h2>Style</h2>

      <StrokeSection
        styleConfig={styleConfig}
        onStyleConfigChange={onStyleConfigChange}
        update={update}
        lines={lines}
        onLinesChange={onLinesChange}
        updateLine={updateLine}
      />

      <BackgroundSection styleConfig={styleConfig} update={update} />

      <BorderSection styleConfig={styleConfig} update={update} />
    </div>
  );
}
