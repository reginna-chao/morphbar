import type { PathPoint, Template, TemplateParam, TemplateResult } from '@/types';

const newId = (): string => crypto.randomUUID();

const anchor = (x: number, y: number): PathPoint => ({ x, y, type: 'anchor' });

// Shared parameter definitions. The order here is the display order in the modal.
const SPACING_PARAM = (defaultValue: number): TemplateParam => ({
  key: 'spacing',
  label: 'Line Spacing',
  min: 5,
  max: 30,
  step: 1,
  defaultValue,
});

const STROKE_WIDTH_PARAM: TemplateParam = {
  key: 'strokeWidth',
  label: 'Stroke Width',
  min: 1,
  max: 10,
  step: 0.5,
  defaultValue: 3,
};

const LINE_WIDTH_PARAM: TemplateParam = {
  key: 'width',
  label: 'Line Width',
  min: 30,
  max: 90,
  step: 1,
  defaultValue: 60,
};

const STANDARD_PARAMS = (spacingDefault: number): TemplateParam[] => [
  SPACING_PARAM(spacingDefault),
  STROKE_WIDTH_PARAM,
  LINE_WIDTH_PARAM,
];

interface BaseGeometry {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const computeGeometry = (spacing: number, width: number): BaseGeometry => {
  const halfW = width / 2;
  return {
    left: 50 - halfW,
    right: 50 + halfW,
    top: 50 - spacing,
    bottom: 50 + spacing,
  };
};

const TEMPLATE_HAMBURGER_X: Template = {
  id: 'hamburger-x',
  name: 'Hamburger → X',
  description: 'Three horizontal lines that morph into an X.',
  params: STANDARD_PARAMS(20),
  generate: ({ spacing, width, strokeWidth }) => {
    const { left, right, top, bottom } = computeGeometry(spacing, width);
    const halfW = width / 2;
    const xTop = 50 - halfW;
    const xBottom = 50 + halfW;
    return {
      lines: [
        {
          id: newId(),
          menu: [anchor(left, top), anchor(right, top)],
          close: [anchor(left, xTop), anchor(right, xBottom)],
        },
        {
          id: newId(),
          menu: [anchor(left, 50), anchor(right, 50)],
          close: [anchor(50, 50), anchor(50, 50)],
        },
        {
          id: newId(),
          menu: [anchor(left, bottom), anchor(right, bottom)],
          close: [anchor(left, xBottom), anchor(right, xTop)],
        },
      ],
      styleOverrides: { strokeWidth },
    };
  },
};

const TEMPLATE_HAMBURGER_ARROW: Template = {
  id: 'hamburger-arrow',
  name: 'Hamburger → Arrow',
  description: 'Three horizontal lines that morph into a left-pointing arrow.',
  params: STANDARD_PARAMS(20),
  generate: ({ spacing, width, strokeWidth }) => {
    const { left, right, top, bottom } = computeGeometry(spacing, width);
    // Arrow head extends back 40% of width from the tip
    const headBack = left + width * 0.4;
    const headTopY = 50 - spacing * 1.25;
    const headBotY = 50 + spacing * 1.25;
    return {
      lines: [
        {
          id: newId(),
          menu: [anchor(left, top), anchor(right, top)],
          close: [anchor(left, 50), anchor(headBack, headTopY)],
        },
        {
          id: newId(),
          menu: [anchor(left, 50), anchor(right, 50)],
          close: [anchor(left, 50), anchor(right, 50)],
        },
        {
          id: newId(),
          menu: [anchor(left, bottom), anchor(right, bottom)],
          close: [anchor(left, 50), anchor(headBack, headBotY)],
        },
      ],
      styleOverrides: { strokeWidth },
    };
  },
};

const TEMPLATE_HAMBURGER_PLUS: Template = {
  id: 'hamburger-plus',
  name: 'Hamburger → Plus',
  description: 'Three horizontal lines that morph into a plus sign.',
  params: STANDARD_PARAMS(20),
  generate: ({ spacing, width, strokeWidth }) => {
    const { left, right, top, bottom } = computeGeometry(spacing, width);
    const halfW = width / 2;
    return {
      lines: [
        {
          id: newId(),
          menu: [anchor(left, top), anchor(right, top)],
          close: [anchor(50, 50 - halfW), anchor(50, 50 + halfW)],
        },
        {
          id: newId(),
          menu: [anchor(left, 50), anchor(right, 50)],
          close: [anchor(left, 50), anchor(right, 50)],
        },
        {
          id: newId(),
          menu: [anchor(left, bottom), anchor(right, bottom)],
          close: [anchor(50, 50), anchor(50, 50)],
        },
      ],
      styleOverrides: { strokeWidth },
    };
  },
};

const TEMPLATE_TWO_LINES_X: Template = {
  id: 'two-lines-x',
  name: 'Two Lines → X',
  description: 'Minimalist two-line hamburger that morphs into an X.',
  params: STANDARD_PARAMS(15),
  generate: ({ spacing, width, strokeWidth }) => {
    const { left, right, top, bottom } = computeGeometry(spacing, width);
    const halfW = width / 2;
    const xTop = 50 - halfW;
    const xBottom = 50 + halfW;
    return {
      lines: [
        {
          id: newId(),
          menu: [anchor(left, top), anchor(right, top)],
          close: [anchor(left, xTop), anchor(right, xBottom)],
        },
        {
          id: newId(),
          menu: [anchor(left, bottom), anchor(right, bottom)],
          close: [anchor(left, xBottom), anchor(right, xTop)],
        },
      ],
      styleOverrides: { strokeWidth },
    };
  },
};

export const TEMPLATES: Template[] = [
  TEMPLATE_HAMBURGER_X,
  TEMPLATE_HAMBURGER_ARROW,
  TEMPLATE_HAMBURGER_PLUS,
  TEMPLATE_TWO_LINES_X,
];

export function getDefaultParams(template: Template): Record<string, number> {
  if (!template.params) return {};
  return Object.fromEntries(template.params.map((p) => [p.key, p.defaultValue]));
}

export function generateTemplateResult(
  template: Template,
  params: Record<string, number>
): TemplateResult {
  return template.generate(params);
}
