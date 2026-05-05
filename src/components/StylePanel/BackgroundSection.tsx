import type { ReactElement } from 'react';
import type { StyleConfig } from '@/types';
import styles from '@/components/StylePanel/StylePanel.module.scss';

interface BackgroundSectionProps {
  styleConfig: StyleConfig;
  update: (patch: Partial<StyleConfig>) => void;
  onStyleConfigCommit: () => void;
}

export default function BackgroundSection({
  styleConfig,
  update,
  onStyleConfigCommit,
}: BackgroundSectionProps): ReactElement {
  return (
    <section className={styles.section}>
      <h3>Background</h3>

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={styleConfig.backgroundTransparent}
          onChange={(e) => {
            update({ backgroundTransparent: e.target.checked });
            onStyleConfigCommit();
          }}
        />
        Transparent
      </label>

      <div className={styles.inputGroup}>
        <label htmlFor="backgroundColor">Color</label>
        <input
          id="backgroundColor"
          type="color"
          value={styleConfig.backgroundColor}
          disabled={styleConfig.backgroundTransparent}
          onChange={(e) => update({ backgroundColor: e.target.value })}
          onBlur={onStyleConfigCommit}
          className={styles.colorInput}
        />
      </div>
    </section>
  );
}
