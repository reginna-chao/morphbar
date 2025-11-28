export function generateCode(lines) {
  // lines is an array of 3 objects: { menu: [start, end], close: [start, end] }
  // We need to construct a single path for each line that connects menu -> close
  
  const paths = lines.map((line, index) => {
    const { menu, close } = line;
    
    // Construct the path data 'd'
    // M menuStart L menuEnd C cp1 cp2 closeStart L closeEnd
    // We need to calculate control points for a smooth connection
    // For now, let's use a simple curve
    
    const dx = close[0].x - menu[1].x;
    const dy = close[0].y - menu[1].y;
    
    const cp1 = { x: menu[1].x + dx * 0.5, y: menu[1].y };
    const cp2 = { x: close[0].x - dx * 0.5, y: close[0].y };
    
    // Create a temporary path element to measure lengths
    const d = `M ${menu[0].x} ${menu[0].y} L ${menu[1].x} ${menu[1].y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${close[0].x} ${close[0].y} L ${close[1].x} ${close[1].y}`;
    
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", d);
    
    const totalLength = pathEl.getTotalLength();
    
    // Measure segments
    // Segment 1: Menu Line
    const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p1.setAttribute("d", `M ${menu[0].x} ${menu[0].y} L ${menu[1].x} ${menu[1].y}`);
    const len1 = p1.getTotalLength();
    
    // Segment 2: Connection
    const p2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p2.setAttribute("d", `M ${menu[1].x} ${menu[1].y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${close[0].x} ${close[0].y}`);
    const len2 = p2.getTotalLength();
    
    // Segment 3: Close Line
    const p3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p3.setAttribute("d", `M ${close[0].x} ${close[0].y} L ${close[1].x} ${close[1].y}`);
    const len3 = p3.getTotalLength();
    
    return {
      d,
      totalLength,
      menuLength: len1,
      closeLength: len3,
      offsetMenu: 0, // Starts at 0
      offsetClose: -(len1 + len2) // Shifts to show the close line
    };
  });

  return {
    html: generateHTML(paths),
    css: generateCSS(paths)
  };
}

function generateHTML(paths) {
  return `<label class="hamburger-menu">
  <input type="checkbox">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
${paths.map((p, i) => `    <path class="line--${i + 1}" d="${p.d}" />`).join('\n')}
  </svg>
</label>`;
}

function generateCSS(paths) {
  return `.hamburger-menu {
  cursor: pointer;
  display: block;
  width: 50px;
  height: 50px;
}

.hamburger-menu input {
  display: none;
}

.hamburger-menu svg {
  width: 100%;
  height: 100%;
}

.hamburger-menu path {
  fill: none;
  stroke: #ffffff;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: all 0.8s cubic-bezier(.645, .045, .355, 1);
}

${paths.map((p, i) => `/* Line ${i + 1} */
.line--${i + 1} {
  stroke-dasharray: ${p.menuLength.toFixed(2)} ${p.totalLength.toFixed(2)};
  stroke-dashoffset: ${p.offsetMenu};
}`).join('\n')}

.hamburger-menu input:checked + svg {
${paths.map((p, i) => `  .line--${i + 1} {
    stroke-dasharray: ${p.closeLength.toFixed(2)} ${p.totalLength.toFixed(2)};
    stroke-dashoffset: ${p.offsetClose.toFixed(2)};
  }`).join('\n')}
}`;
}
