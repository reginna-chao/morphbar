import { useMemo, type ReactElement } from 'react';
import type { ClassNameConfig, Method, PreviewThemeConfig } from '@/types';
import Preview from '@/components/Preview';
import PreviewThemeSwitcher from '@/components/PreviewThemeSwitcher';
import { resolvePreviewBackground, resolvePreviewBorder } from '@/utils/previewTheme';
import styles from './FloatingPreview.module.scss';

interface FloatingPreviewProps {
  html: string;
  css: string;
  method: Method;
  classNameConfig: ClassNameConfig;
  themeConfig: PreviewThemeConfig;
  onThemeConfigChange: (config: PreviewThemeConfig) => void;
}

export default function FloatingPreview({
  html,
  css,
  method,
  classNameConfig,
  themeConfig,
  onThemeConfigChange,
}: FloatingPreviewProps): ReactElement {
  const background = useMemo(() => resolvePreviewBackground(themeConfig), [themeConfig]);
  const borderColor = useMemo(() => resolvePreviewBorder(themeConfig), [themeConfig]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Live Preview</h2>
      <PreviewThemeSwitcher themeConfig={themeConfig} onThemeConfigChange={onThemeConfigChange} />
      <div className={styles.previewArea}>
        <Preview
          html={html}
          css={css}
          method={method}
          classNameConfig={classNameConfig}
          background={background}
          borderColor={borderColor}
        />
      </div>
      <div className={styles.caption}>Click to animate</div>
    </div>
  );
}
