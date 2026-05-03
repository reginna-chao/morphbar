import { useRef, useEffect, type CSSProperties, type ReactElement } from 'react';
import type { ClassNameConfig, Method } from '@/types';
import styles from './Preview.module.scss';

interface PreviewProps {
  html: string;
  css: string;
  method: Method;
  classNameConfig: ClassNameConfig;
  background: string;
  borderColor: string;
}

export default function Preview({
  html,
  css,
  method,
  classNameConfig,
  background,
  borderColor,
}: PreviewProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const { baseClass, activeClass } = classNameConfig;

  // Effect 1: inject html + css. Re-runs only when the generated markup changes.
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = html;
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    containerRef.current.appendChild(styleEl);
  }, [html, css]);

  // Effect 2: attach class-mode click handler. `html` is in deps because the
  // innerHTML reset above wipes the previously queried element, so the
  // listener must re-attach on the freshly injected node.
  useEffect(() => {
    if (method !== 'class' || !containerRef.current) return;
    const menu = containerRef.current.querySelector(`.${baseClass}`);
    if (!menu) return;
    const handleClick = (): void => {
      menu.classList.toggle(activeClass);
    };
    menu.addEventListener('click', handleClick);
    return () => {
      menu.removeEventListener('click', handleClick);
    };
  }, [method, baseClass, activeClass, html]);

  const themeStyle = {
    '--preview-bg': background,
    '--preview-border': borderColor,
  } as CSSProperties;

  return (
    <div className={styles.previewBox} style={themeStyle} id="preview-container-wrapper">
      <div ref={containerRef} id="preview-container" />
    </div>
  );
}
