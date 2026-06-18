import type { ReactElement } from 'react';
import { getLineColor } from '@/utils/colors';
import type { Lines, LineStyleOverride, StyleConfig } from '@/types';
import styles from '@/components/StylePanel/StylePanel.module.scss';

const STROKE_WIDTH_MIN = 1;
const STROKE_WIDTH_MAX = 20;

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

interface StrokeSectionProps {
  styleConfig: StyleConfig;
  onStyleConfigChange: (config: StyleConfig) => void;
  onStyleConfigCommit: () => void;
  update: (patch: Partial<StyleConfig>) => void;
  lines: Lines;
  onLinesChange: (lines: Lines) => void;
  updateLine: (index: number, patch: Partial<LineStyleOverride>) => void;
  commitLine: (index: number, patch: Partial<LineStyleOverride>) => void;
}

export default function StrokeSection({
  styleConfig,
  onStyleConfigChange,
  onStyleConfigCommit,
  update,
  lines,
  onLinesChange,
  updateLine,
  commitLine,
}: StrokeSectionProps): ReactElement {
  const handlePerLineColorToggle = (checked: boolean): void => {
    if (!checked) {
      // Toggle OFF: just flip the flag; preserve existing line.color values.
      update({ perLineColor: false });
      onStyleConfigCommit();
      return;
    }

    // Toggle ON: seed line.color for any line missing a custom color so that
    // the inputs reflect the palette default the user already sees.
    const seededLines: Lines = lines.map((line, index) =>
      line.color === undefined ? { ...line, color: getLineColor(index) } : line
    );
    onStyleConfigChange({ ...styleConfig, perLineColor: true });
    onLinesChange(seededLines);
    onStyleConfigCommit();
  };

  const handlePerLineWidthToggle = (checked: boolean): void => {
    if (!checked) {
      update({ perLineWidth: false });
      onStyleConfigCommit();
      return;
    }

    const seededLines: Lines = lines.map((line) =>
      line.strokeWidth === undefined ? { ...line, strokeWidth: styleConfig.strokeWidth } : line
    );
    onStyleConfigChange({ ...styleConfig, perLineWidth: true });
    onLinesChange(seededLines);
    onStyleConfigCommit();
  };

  const parseStrokeWidth = (raw: string): number => {
    const parsed = parseInt(raw);
    if (Number.isNaN(parsed)) return STROKE_WIDTH_MIN;
    return clamp(parsed, STROKE_WIDTH_MIN, STROKE_WIDTH_MAX);
  };

  return (
    <section className={styles.section}>
      <h3>Stroke</h3>

      <div className={styles.inputGroup}>
        <label htmlFor="strokeColor">Color</label>
        <input
          id="strokeColor"
          type="color"
          value={styleConfig.strokeColor}
          onChange={(e) => update({ strokeColor: e.target.value })}
          onBlur={onStyleConfigCommit}
          className={styles.colorInput}
        />
      </div>

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={styleConfig.perLineColor}
          onChange={(e) => handlePerLineColorToggle(e.target.checked)}
        />
        Set color per line
      </label>

      {styleConfig.perLineColor && (
        <div className={styles.perLineList}>
          {lines.map((line, index) => {
            const value = line.color ?? getLineColor(index, undefined);
            return (
              <label key={line.id} className={styles.perLineRow}>
                <span className={styles.perLineLabel}>Line {index + 1}</span>
                <input
                  type="color"
                  value={value}
                  onChange={(e) => updateLine(index, { color: e.target.value })}
                  onBlur={(e) => commitLine(index, { color: e.target.value })}
                  className={styles.colorInput}
                />
              </label>
            );
          })}
        </div>
      )}

      <div className={styles.inputGroup}>
        <label htmlFor="strokeWidth">Width</label>
        <div className={styles.sliderGroup}>
          <input
            id="strokeWidth"
            type="range"
            min={STROKE_WIDTH_MIN}
            max={STROKE_WIDTH_MAX}
            step="1"
            value={styleConfig.strokeWidth}
            onChange={(e) => update({ strokeWidth: parseStrokeWidth(e.target.value) })}
            onPointerUp={onStyleConfigCommit}
            onKeyUp={onStyleConfigCommit}
            className={styles.slider}
          />
          <input
            type="number"
            min={STROKE_WIDTH_MIN}
            max={STROKE_WIDTH_MAX}
            value={styleConfig.strokeWidth}
            onChange={(e) => update({ strokeWidth: parseStrokeWidth(e.target.value) })}
            onBlur={onStyleConfigCommit}
            aria-label="Stroke width value"
            className={styles.numberInput}
          />
        </div>
      </div>

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={styleConfig.perLineWidth}
          onChange={(e) => handlePerLineWidthToggle(e.target.checked)}
        />
        Set width per line
      </label>

      {styleConfig.perLineWidth && (
        <div className={styles.perLineList}>
          {lines.map((line, index) => {
            const value = line.strokeWidth ?? styleConfig.strokeWidth;
            return (
              <label key={line.id} className={styles.perLineRow}>
                <span className={styles.perLineLabel}>Line {index + 1}</span>
                <input
                  type="number"
                  min={STROKE_WIDTH_MIN}
                  max={STROKE_WIDTH_MAX}
                  value={value}
                  onChange={(e) =>
                    updateLine(index, { strokeWidth: parseStrokeWidth(e.target.value) })
                  }
                  onBlur={(e) =>
                    commitLine(index, { strokeWidth: parseStrokeWidth(e.target.value) })
                  }
                  className={styles.numberInput}
                />
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
