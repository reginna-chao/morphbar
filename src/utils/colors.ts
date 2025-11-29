// Default color palette for lines (up to 10)
export const DEFAULT_LINE_COLORS = [
  '#ff6b6b', // Red
  '#4ecdc4', // Cyan
  '#ffe66d', // Yellow
  '#a8e6cf', // Mint
  '#ff8b94', // Pink
  '#c7ceea', // Lavender
  '#ffd3b6', // Peach
  '#ff9aa2', // Rose
  '#b5ead7', // Aqua
  '#dcedc1', // Light green
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
