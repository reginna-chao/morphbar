import type {
  LineState,
  Method,
  PathData,
  GeneratedCode,
  ClassNameConfig,
  SizeConfig,
  PathPoint,
} from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Generate SVG path string, supports multi-point and Bezier curves
function generatePathString(points: PathPoint[]): string {
  if (points.length < 2) return '';

  const anchors = points.filter((p) => p.type === 'anchor');
  if (anchors.length < 2) return '';

  // Simplified version: Currently connects all anchor points with straight lines
  // Future: Can generate Bezier curves based on control points
  const commands = [`M ${anchors[0].x} ${anchors[0].y}`];

  for (let i = 1; i < anchors.length; i++) {
    commands.push(`L ${anchors[i].x} ${anchors[i].y}`);
  }

  return commands.join(' ');
}

export function generateCode(
  lines: LineState[],
  method: Method = 'checkbox',
  classNameConfig: ClassNameConfig = { baseClass: 'hamburger-menu', activeClass: 'is-active' },
  sizeConfig: SizeConfig = { width: 50, strokeWidth: 3 }
): GeneratedCode {
  const paths = lines.map((line) => calculatePathData(line));

  const html = generateHTML(paths, method, classNameConfig.baseClass);
  const css = generateCSS(paths, method, classNameConfig, sizeConfig);
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

  const menuAnchors = menu.filter((p) => p.type === 'anchor');
  const closeAnchors = close.filter((p) => p.type === 'anchor');

  if (menuAnchors.length < 2 || closeAnchors.length < 2) {
    // Handle error case
    return {
      d: '',
      totalLength: 0,
      menuLength: 0,
      closeLength: 0,
      offsetMenu: 0,
      offsetClose: 0,
    };
  }

  const menuLast = menuAnchors[menuAnchors.length - 1];
  const closeFirst = closeAnchors[0];

  // Calculate Bezier curve control points connecting the two states
  const dx = closeFirst.x - menuLast.x;
  const cp1 = { x: menuLast.x + dx * 0.5, y: menuLast.y };
  const cp2 = { x: closeFirst.x - dx * 0.5, y: closeFirst.y };

  // Generate complete path: menu state -> transition curve -> close state
  const menuPath = generatePathString(menu);
  const closePath = generatePathString(close);

  const d = `${menuPath} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${closeFirst.x} ${closeFirst.y} ${closePath.substring(closePath.indexOf('L'))}`;

  // Calculate path lengths
  const pathEl = document.createElementNS(SVG_NS, 'path');
  pathEl.setAttribute('d', d);
  const totalLength = pathEl.getTotalLength();

  const menuEl = document.createElementNS(SVG_NS, 'path');
  menuEl.setAttribute('d', menuPath);
  const menuLength = menuEl.getTotalLength();

  const closeEl = document.createElementNS(SVG_NS, 'path');
  closeEl.setAttribute('d', closePath);
  const closeLength = closeEl.getTotalLength();

  const connectionEl = document.createElementNS(SVG_NS, 'path');
  connectionEl.setAttribute(
    'd',
    `M ${menuLast.x} ${menuLast.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${closeFirst.x} ${closeFirst.y}`
  );
  const connectionLength = connectionEl.getTotalLength();

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

function generateCSS(
  paths: PathData[],
  method: Method,
  classNameConfig: ClassNameConfig,
  sizeConfig: SizeConfig
): string {
  const { baseClass, activeClass } = classNameConfig;
  const { width, strokeWidth } = sizeConfig;

  const baseCSS = `.${baseClass} {
  cursor: pointer;
  display: block;
  width: ${width}px;
  height: ${width}px;
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
