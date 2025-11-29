export interface Point {
  x: number;
  y: number;
}

// PathPoint is used for Bezier curves, distinguishes between anchor and control points
export interface PathPoint extends Point {
  type: 'anchor' | 'control';
}

export interface LineState {
  menu: PathPoint[];
  close: PathPoint[];
  color?: string; // Optional custom color for the line
}

export type Lines = LineState[];

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
  strokeWidth: number; // SVG stroke width
}

export interface DraggedPoint {
  lineIndex: number;
  pointIndex: number;
  originX: number;
  originY: number;
}

// Tool types
export type Tool = 'select' | 'pen-add' | 'pen-remove';
