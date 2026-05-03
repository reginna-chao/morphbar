import { useRef, type ChangeEvent, type ReactElement } from 'react';
import type { PreviewTheme, PreviewThemeConfig } from '@/types';
import { PREVIEW_THEME_COLORS } from '@/utils/previewTheme';
import styles from './PreviewThemeSwitcher.module.scss';

interface PreviewThemeSwitcherProps {
  themeConfig: PreviewThemeConfig;
  onThemeConfigChange: (config: PreviewThemeConfig) => void;
}

export default function PreviewThemeSwitcher({
  themeConfig,
  onThemeConfigChange,
}: PreviewThemeSwitcherProps): ReactElement {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const isActive = (theme: PreviewTheme): boolean => themeConfig.theme === theme;

  const selectTheme = (theme: PreviewTheme): void => {
    onThemeConfigChange({ ...themeConfig, theme });
  };

  // Single-click semantics: switching to 'custom' commits the theme change
  // immediately (so cancelling the picker still leaves the user on custom),
  // then opens the native picker for an optional color refinement.
  const handleCustomClick = (): void => {
    selectTheme('custom');
    colorInputRef.current?.click();
  };

  const handleCustomColorChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onThemeConfigChange({ theme: 'custom', customColor: event.target.value });
  };

  return (
    <div className={styles.switcher}>
      <button
        type="button"
        aria-label="Dark theme"
        aria-pressed={isActive('dark')}
        className={`${styles.swatch} ${isActive('dark') ? styles.active : ''}`}
        style={{ background: PREVIEW_THEME_COLORS.dark.background }}
        onClick={() => selectTheme('dark')}
      />
      <button
        type="button"
        aria-label="Light theme"
        aria-pressed={isActive('light')}
        className={`${styles.swatch} ${styles.swatchLight} ${
          isActive('light') ? styles.active : ''
        }`}
        style={{ background: PREVIEW_THEME_COLORS.light.background }}
        onClick={() => selectTheme('light')}
      />
      <button
        type="button"
        aria-label="Custom theme color picker"
        aria-pressed={isActive('custom')}
        className={`${styles.swatch} ${isActive('custom') ? styles.active : ''}`}
        style={{ background: themeConfig.customColor }}
        onClick={handleCustomClick}
      >
        <input
          ref={colorInputRef}
          type="color"
          value={themeConfig.customColor}
          onChange={handleCustomColorChange}
          className={styles.hiddenColorInput}
          tabIndex={-1}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
