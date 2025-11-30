// Default color palette for lines (up to 10)
export const DEFAULT_LINE_COLORS = [
  '#ff6b6b', // Red
  '#4ecdc4', // Cyan
  '#ffe66d', // Yellow
  '#7b5df0', // Medium Purple
  '#ff8f1f', // Orange
  '#33b679', // Emerald Green
  '#3a86ff', // Blue
  '#ff5eaf', // Magenta
  '#5ec2ff', // Sky Blue
  '#9c6d3b', // Warm Brown (balanced neutral)
];

export function getLineColor(index: number, customColor?: string): string {
  if (customColor) return customColor;
  return DEFAULT_LINE_COLORS[index % DEFAULT_LINE_COLORS.length];
}

export function createDefaultLine(): {
  menu: { x: number; y: number; type: 'anchor' | 'control' }[];
  close: { x: number; y: number; type: 'anchor' | 'control' }[];
} {
  return {
    menu: [
      { x: 20, y: 50, type: 'anchor' },
      { x: 80, y: 50, type: 'anchor' },
    ],
    close: [
      { x: 50, y: 50, type: 'anchor' },
      { x: 50, y: 50, type: 'anchor' },
    ],
  };
}
