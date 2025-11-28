import type { LineState, Method, PathData, GeneratedCode, ClassNameConfig } from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function generateCode(
  lines: LineState[],
  method: Method = 'checkbox',
  classNameConfig: ClassNameConfig = { baseClass: 'hamburger-menu', activeClass: 'is-active' }
): GeneratedCode {
  const paths = lines.map((line) => calculatePathData(line));

  const html = generateHTML(paths, method, classNameConfig.baseClass);
  const css = generateCSS(paths, method, classNameConfig);
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

function calculatePathData(line: LineState): PathData {
  const { menu, close } = line;

  const dx = close[0].x - menu[1].x;

  const cp1 = { x: menu[1].x + dx * 0.5, y: menu[1].y };
  const cp2 = { x: close[0].x - dx * 0.5, y: close[0].y };

  const d = `M ${menu[0].x} ${menu[0].y} L ${menu[1].x} ${menu[1].y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${close[0].x} ${close[0].y} L ${close[1].x} ${close[1].y}`;

  const pathEl = document.createElementNS(SVG_NS, 'path');
  pathEl.setAttribute('d', d);
  const totalLength = pathEl.getTotalLength();

  const p1 = document.createElementNS(SVG_NS, 'path');
  p1.setAttribute('d', `M ${menu[0].x} ${menu[0].y} L ${menu[1].x} ${menu[1].y}`);
  const menuLength = p1.getTotalLength();

  const p2 = document.createElementNS(SVG_NS, 'path');
  p2.setAttribute(
    'd',
    `M ${menu[1].x} ${menu[1].y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${close[0].x} ${close[0].y}`
  );
  const connectionLength = p2.getTotalLength();

  const p3 = document.createElementNS(SVG_NS, 'path');
  p3.setAttribute('d', `M ${close[0].x} ${close[0].y} L ${close[1].x} ${close[1].y}`);
  const closeLength = p3.getTotalLength();

  return {
    d,
    totalLength,
    menuLength,
    closeLength,
    offsetMenu: 0,
    offsetClose: -(menuLength + connectionLength),
  };
}

function generateHTML(paths: PathData[], method: Method, baseClass: string): string {
  const pathsHTML = paths
    .map((p, i) => `    <path class="line--${i + 1}" d="${p.d}" />`)
    .join('\n');

  if (method === 'checkbox') {
    return `<label class="${baseClass}">
  <input type="checkbox">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
${pathsHTML}
  </svg>
</label>`;
  } else {
    return `<button class="${baseClass}">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
${pathsHTML}
  </svg>
</button>`;
  }
}

function generateCSS(paths: PathData[], method: Method, classNameConfig: ClassNameConfig): string {
  const { baseClass, activeClass } = classNameConfig;

  const baseCSS = `.${baseClass} {
  cursor: pointer;
  display: block;
  width: 50px;
  height: 50px;
  background: transparent;
  border: none;
  padding: 0;
}

.${baseClass} svg {
  width: 100%;
  height: 100%;
}

.${baseClass} path {
  fill: none;
  stroke: #ffffff;
  stroke-width: 3;
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
  .join('\n')}
}`;

  return baseCSS + checkboxCSS + activeCSS;
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
