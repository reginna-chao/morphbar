export interface Point {
  x: number;
  y: number;
}

// PathPoint is used for Bezier curves, distinguishes between anchor and control points
export interface PathPoint extends Point {
  type: 'anchor' | 'control';
}

export interface LineState {
  id: string; // Stable identifier (used as React list key)
  menu: PathPoint[];
  close: PathPoint[];
  color?: string; // Optional custom color for the line
  strokeWidth?: number; // Optional per-line stroke width override
}

export type Lines = LineState[];

// Subset of LineState fields that the Style panel may override per line.
export type LineStyleOverride = Pick<LineState, 'color' | 'strokeWidth'>;

export type Mode = 'menu' | 'close';

export type Method = 'checkbox' | 'class';

export interface PathData {
  d: string;
  totalLength: number;
  menuLength: number;
  closeLength: number;
  offsetMenu: number;
  offsetClose: number;
}

export interface GeneratedCode {
  html: string;
  css: string;
  js: string;
  fullCode: string;
}

export interface ClassNameConfig {
  baseClass: string;
  activeClass: string;
}

export interface SizeConfig {
  width: number; // in pixels
  horizontalShift: number; // viewBox units, -200 to 200, default 0
}

export interface StyleConfig {
  strokeColor: string; // global stroke color (e.g. '#ffffff')
  strokeWidth: number; // global SVG stroke width
  perLineColor: boolean; // when true, use line.color override per line
  perLineWidth: boolean; // when true, use line.strokeWidth override per line
  backgroundColor: string; // hex color for background
  backgroundTransparent: boolean; // when true, output 'transparent' regardless of backgroundColor
  borderWidth: number; // 0 omits the border declaration
  borderColor: string; // hex color for border
  borderRadius: number; // 0 omits the border-radius declaration
}

export interface DraggedPoint {
  lineIndex: number;
  pointIndex: number;
  originX: number;
  originY: number;
}

export type LineIndex = number;

export interface MirrorGroup {
  id: string;
  direction: 'horizontal' | 'vertical';
  sourceLine: LineIndex;
  targetLines: LineIndex[];
}

// Alignment guide shown during drag
export interface AlignmentGuide {
  axis: 'horizontal' | 'vertical';
  position: number;
  isCenter: boolean;
}

// Tool types
export type Tool = 'select' | 'pen-add' | 'pen-remove';
