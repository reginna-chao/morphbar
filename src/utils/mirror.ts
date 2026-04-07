import type { LineState, PathPoint, MirrorGroup } from '@/types';

const SVG_VIEWBOX_SIZE = 100;

export function applyMirror(
  sourcePoints: PathPoint[],
  direction: 'horizontal' | 'vertical'
): PathPoint[] {
  return sourcePoints.map((p) => ({
    ...p,
    x: direction === 'vertical' ? SVG_VIEWBOX_SIZE - p.x : p.x,
    y: direction === 'horizontal' ? SVG_VIEWBOX_SIZE - p.y : p.y,
  }));
}

export function adjustMirrorGroups(groups: MirrorGroup[], removedIndex: number): MirrorGroup[] {
  return groups
    .filter((g) => g.sourceLine !== removedIndex)
    .map((g) => ({
      ...g,
      sourceLine: g.sourceLine > removedIndex ? g.sourceLine - 1 : g.sourceLine,
      targetLines: g.targetLines
        .filter((t) => t !== removedIndex)
        .map((t) => (t > removedIndex ? t - 1 : t)),
    }))
    .filter((g) => g.targetLines.length > 0);
}

export function applyMirrorSync(lines: LineState[], groups: MirrorGroup[]): LineState[] {
  if (groups.length === 0) return lines;

  const result: LineState[] = structuredClone(lines);

  for (const group of groups) {
    const { sourceLine, targetLines, direction } = group;
    if (sourceLine >= result.length) continue;

    for (const targetIndex of targetLines) {
      if (targetIndex >= result.length) continue;
      if (targetIndex === sourceLine) continue;
      result[targetIndex].menu = applyMirror(result[sourceLine].menu, direction);
      result[targetIndex].close = applyMirror(result[sourceLine].close, direction);
    }
  }

  return result;
}
