import type { LineState, PathData, PathPoint } from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Generate SVG path string, supports multi-point and Bezier curves
// xOffset shifts all anchor x coordinates (used for horizontal shift effect)
export function generatePathString(points: PathPoint[], xOffset = 0): string {
  if (points.length < 2) return '';

  const anchors = points.filter((p) => p.type === 'anchor');
  if (anchors.length < 2) return '';

  const commands = [`M ${anchors[0].x + xOffset} ${anchors[0].y}`];

  for (let i = 1; i < anchors.length; i++) {
    commands.push(`L ${anchors[i].x + xOffset} ${anchors[i].y}`);
  }

  return commands.join(' ');
}

// Generate only L-commands for anchors after the first (used in combined path construction)
function generateContinuationPath(points: PathPoint[], xOffset = 0): string {
  const anchors = points.filter((p) => p.type === 'anchor');
  if (anchors.length < 2) return '';

  return anchors
    .slice(1)
    .map((a) => `L ${a.x + xOffset} ${a.y}`)
    .join(' ');
}

export function calculatePathData(line: LineState, horizontalShift = 0): PathData {
  const { menu, close } = line;

  const menuAnchors = menu.filter((p) => p.type === 'anchor');
  const closeAnchors = close.filter((p) => p.type === 'anchor');

  if (menuAnchors.length < 2 || closeAnchors.length < 2) {
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

  // Apply horizontal shift offset to close first anchor
  const closeFirstOffset = { x: closeFirst.x + horizontalShift, y: closeFirst.y };

  // Calculate Bezier curve control points connecting menu end to offset close start
  const dx = closeFirstOffset.x - menuLast.x;
  const cp1 = { x: menuLast.x + dx * 0.5, y: menuLast.y };
  const cp2 = { x: closeFirstOffset.x - dx * 0.5, y: closeFirstOffset.y };

  // Generate complete path: menu state -> transition curve -> close state (with offset)
  const menuPath = generatePathString(menu);
  const closeContinuation = generateContinuationPath(close, horizontalShift);

  const d = `${menuPath} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${closeFirstOffset.x} ${closeFirstOffset.y} ${closeContinuation}`;

  // Calculate path lengths
  const pathEl = document.createElementNS(SVG_NS, 'path');
  pathEl.setAttribute('d', d);
  const totalLength = pathEl.getTotalLength();

  const menuEl = document.createElementNS(SVG_NS, 'path');
  menuEl.setAttribute('d', menuPath);
  const menuLength = menuEl.getTotalLength();

  // Close path length uses ORIGINAL coordinates (same shape, just shifted)
  const closeOriginalPath = generatePathString(close);
  const closeEl = document.createElementNS(SVG_NS, 'path');
  closeEl.setAttribute('d', closeOriginalPath);
  const closeLength = closeEl.getTotalLength();

  // Connection length uses offset coordinates
  const connectionEl = document.createElementNS(SVG_NS, 'path');
  connectionEl.setAttribute(
    'd',
    `M ${menuLast.x} ${menuLast.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${closeFirstOffset.x} ${closeFirstOffset.y}`
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
