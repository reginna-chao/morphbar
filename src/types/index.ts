export interface Point {
  x: number;
  y: number;
}

export interface LineState {
  menu: [Point, Point];
  close: [Point, Point];
}

export type Lines = [LineState, LineState, LineState];

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

export interface DraggedPoint {
  lineIndex: number;
  pointIndex: number;
  originX: number;
  originY: number;
}
