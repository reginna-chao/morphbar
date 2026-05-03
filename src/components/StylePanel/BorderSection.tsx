import type { ReactElement } from 'react';
import type { StyleConfig } from '@/types';
import styles from '@/components/StylePanel/StylePanel.module.scss';

const BORDER_WIDTH_MIN = 0;
const BORDER_WIDTH_MAX = 20;
const BORDER_RADIUS_MIN = 0;
const BORDER_RADIUS_MAX = 50;

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

interface BorderSectionProps {
  styleConfig: StyleConfig;
  update: (patch: Partial<StyleConfig>) => void;
}

export default function BorderSection({ styleConfig, update }: BorderSectionProps): ReactElement {
  const parseBorderWidth = (raw: string): number => {
    const parsed = parseInt(raw);
    if (Number.isNaN(parsed)) return BORDER_WIDTH_MIN;
    return clamp(parsed, BORDER_WIDTH_MIN, BORDER_WIDTH_MAX);
  };

  const parseBorderRadius = (raw: string): number => {
    const parsed = parseInt(raw);
    if (Number.isNaN(parsed)) return BORDER_RADIUS_MIN;
    return clamp(parsed, BORDER_RADIUS_MIN, BORDER_RADIUS_MAX);
  };

  return (
    <section className={styles.section}>
      <h3>Border</h3>

      <div className={styles.inputGroup}>
        <label htmlFor="borderWidth">Width</label>
        <input
          id="borderWidth"
          type="number"
          min={BORDER_WIDTH_MIN}
          max={BORDER_WIDTH_MAX}
          value={styleConfig.borderWidth}
          onChange={(e) => update({ borderWidth: parseBorderWidth(e.target.value) })}
          className={styles.numberInput}
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="borderColor">Color</label>
        <input
          id="borderColor"
          type="color"
          value={styleConfig.borderColor}
          onChange={(e) => update({ borderColor: e.target.value })}
          className={styles.colorInput}
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="borderRadius">Radius</label>
        <input
          id="borderRadius"
          type="number"
          min={BORDER_RADIUS_MIN}
          max={BORDER_RADIUS_MAX}
          value={styleConfig.borderRadius}
          onChange={(e) => update({ borderRadius: parseBorderRadius(e.target.value) })}
          className={styles.numberInput}
        />
      </div>
    </section>
  );
}
