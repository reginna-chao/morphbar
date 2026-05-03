import type {
  LineState,
  Method,
  PathData,
  GeneratedCode,
  ClassNameConfig,
  SizeConfig,
  StyleConfig,
} from '../types';
import { calculatePathData } from './pathCalculation';

const DEFAULT_STYLE_CONFIG: StyleConfig = {
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

export function generateCode(
  lines: LineState[],
  method: Method = 'checkbox',
  classNameConfig: ClassNameConfig = { baseClass: 'hamburger-menu', activeClass: 'is-active' },
  sizeConfig: SizeConfig = { width: 50, horizontalShift: 0 },
  styleConfig: StyleConfig = DEFAULT_STYLE_CONFIG
): GeneratedCode {
  const paths = lines.map((line) => calculatePathData(line, sizeConfig.horizontalShift));

  const html = generateHTML(paths, method, classNameConfig.baseClass, sizeConfig.horizontalShift);
  const css = generateCSS(paths, method, classNameConfig, sizeConfig, styleConfig, lines);
  const js = generateJS(method, classNameConfig);

  let fullCode = `<style>\n${css}\n</style>\n\n${html}`;
  if (js) {
    fullCode += `\n\n<script>\n${js}\n</script>`;
  }

  return {
    html,
    css,
    js,
    fullCode,
  };
}

function generateHTML(
  paths: PathData[],
  method: Method,
  baseClass: string,
  horizontalShift = 0
): string {
  const useGroup = horizontalShift !== 0;
  const indent = useGroup ? '      ' : '    ';
  const pathsHTML = paths
    .map((p, i) => `${indent}<path class="line--${i + 1}" d="${p.d}" />`)
    .join('\n');

  const svgContent = useGroup ? `    <g class="svg-group">\n${pathsHTML}\n    </g>` : pathsHTML;

  if (method === 'checkbox') {
    return `<label class="${baseClass}">
  <input type="checkbox">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
${svgContent}
  </svg>
</label>`;
  } else {
    return `<button class="${baseClass}">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
${svgContent}
  </svg>
</button>`;
  }
}

function generatePerLineOverrides(lines: LineState[], styleConfig: StyleConfig): string {
  const overrides: string[] = [];

  lines.forEach((line, i) => {
    const declarations: string[] = [];
    if (styleConfig.perLineColor && line.color !== undefined) {
      declarations.push(`  stroke: ${line.color};`);
    }
    if (styleConfig.perLineWidth && line.strokeWidth !== undefined) {
      declarations.push(`  stroke-width: ${line.strokeWidth};`);
    }
    if (declarations.length > 0) {
      overrides.push(`.line--${i + 1} {\n${declarations.join('\n')}\n}`);
    }
  });

  return overrides.length > 0 ? '\n\n' + overrides.join('\n') : '';
}

function generateCSS(
  paths: PathData[],
  method: Method,
  classNameConfig: ClassNameConfig,
  sizeConfig: SizeConfig,
  styleConfig: StyleConfig,
  lines: LineState[]
): string {
  const { baseClass, activeClass } = classNameConfig;
  const { width, horizontalShift } = sizeConfig;
  const {
    strokeColor,
    strokeWidth,
    backgroundColor,
    backgroundTransparent,
    borderWidth,
    borderColor,
    borderRadius,
  } = styleConfig;

  const backgroundValue = backgroundTransparent ? 'transparent' : backgroundColor;
  // Spec: omit border when borderWidth === 0. We still need to reset the default
  // <button> border for the `class` method, so emit `border: none;` only in that case.
  const borderDecl = computeBorderDecl(borderWidth, borderColor, method);
  const radiusDecl = borderRadius > 0 ? `\n  border-radius: ${borderRadius}px;` : '';

  const baseCSS = `.${baseClass} {
  cursor: pointer;
  display: block;
  width: ${width}px;
  height: ${width}px;
  background: ${backgroundValue};${borderDecl}${radiusDecl}
  padding: 0;
}

.${baseClass} svg {
  width: 100%;
  height: 100%;
}

.${baseClass} path {
  fill: none;
  stroke: ${strokeColor};
  stroke-width: ${strokeWidth};
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: all 0.8s cubic-bezier(.645, .045, .355, 1);
}

${paths
  .map(
    (p, i) => `/* Line ${i + 1} */
.line--${i + 1} {
  stroke-dasharray: ${p.menuLength.toFixed(2)} ${p.totalLength.toFixed(2)};
  stroke-dashoffset: ${p.offsetMenu};
}`
  )
  .join('\n')}`;

  const perLineOverrides = generatePerLineOverrides(lines, styleConfig);

  // Add .svg-group transition when horizontal shift is active
  const groupCSS =
    horizontalShift !== 0
      ? `\n.${baseClass} .svg-group {
  transition: transform 0.8s cubic-bezier(.645, .045, .355, 1);
}\n`
      : '';

  const activeSelector =
    method === 'checkbox'
      ? `.${baseClass} input:checked + svg`
      : `.${baseClass}.${activeClass} svg`;

  const checkboxCSS =
    method === 'checkbox'
      ? `\n.${baseClass} input {
  display: none;
}\n`
      : '';

  // CSS transform on SVG <g> uses the SVG coordinate system (viewBox units),
  // so translateX value equals the shift in viewBox units — no px conversion needed.
  // This scales naturally with any rendered size.
  const translateX = (-horizontalShift).toFixed(2);

  const activeGroupCSS =
    horizontalShift !== 0
      ? `\n  .svg-group {
    transform: translateX(${translateX}px);
  }`
      : '';

  const activeCSS = `
${activeSelector} {
${paths
  .map((p, i) => {
    const dashArray =
      p.closeLength < 0.1 ? '0 9999' : `${p.closeLength.toFixed(2)} ${p.totalLength.toFixed(2)}`;
    return `  .line--${i + 1} {
    stroke-dasharray: ${dashArray};
    stroke-dashoffset: ${p.offsetClose.toFixed(2)};
  }`;
  })
  .join('\n')}${activeGroupCSS}
}`;

  return baseCSS + perLineOverrides + groupCSS + checkboxCSS + activeCSS;
}

function computeBorderDecl(borderWidth: number, borderColor: string, method: Method): string {
  if (borderWidth > 0) {
    return `\n  border: ${borderWidth}px solid ${borderColor};`;
  }
  // Reset default <button> border for the `class` method only.
  if (method === 'class') {
    return `\n  border: none;`;
  }
  return '';
}

function generateJS(method: Method, classNameConfig: ClassNameConfig): string {
  const { baseClass, activeClass } = classNameConfig;

  if (method === 'class') {
    return `const menu = document.querySelector('.${baseClass}');

menu.addEventListener('click', () => {
  menu.classList.toggle('${activeClass}');
});`;
  }
  return '';
}
