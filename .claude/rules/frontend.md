# Frontend Rules — MorphBar

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 7 (`@vitejs/plugin-react`)
- **Styling**: SCSS Modules (`.module.scss` files)
- **Icons**: lucide-react
- **Notifications**: react-toastify
- **Tooltips**: react-tooltip

## Project Structure

```
src/
├── App.tsx                  # Root app component
├── main.tsx                 # Entry point
├── vite-env.d.ts            # Vite type declarations
├── components/              # React components
│   ├── ui/                  # Reusable UI primitives (Button, SegmentedControl)
│   ├── *.tsx                # Feature components
│   └── *.module.scss        # Co-located SCSS modules
├── config/                  # App configuration (toast config)
├── styles/                  # Global styles
│   ├── global.scss          # Global stylesheet
│   └── variables.scss       # SCSS variables (auto-imported via Vite)
├── types/                   # TypeScript type definitions
│   └── index.ts
├── utils/                   # Utility functions
│   ├── colors.ts
│   └── generator.ts         # Code generation logic
└── assets/                  # Static assets
```

## Component Conventions

- Functional components with explicit return types.
- Props defined as `interface {Component}Props`.
- One component per file. Co-locate `.module.scss` next to component.
- UI primitives go in `components/ui/{Name}/` with `index.tsx` + SCSS module.
- Feature components go directly in `components/`.

## Styling

- **SCSS Modules** for component-scoped styles (not Tailwind).
- Global SCSS variables defined in `src/styles/variables.scss` — auto-imported via Vite config.
- Access variables directly (no import needed): `$variable-name`.
- Import module styles: `import styles from './Component.module.scss'`.
- Use CSS custom properties for theming (light/dark mode).
- No inline `style` objects for layouts — use SCSS modules.

## State Management

- React built-in: `useState`, `useCallback`, `useMemo`, `useRef`.
- No external state library. Keep state as local as possible.
- Lift state to `App.tsx` only when multiple siblings need it.

## Path Alias

- Use `@/` for all imports from `src/`: `import { Point } from '@/types'`.

## Do NOT

- Use Tailwind CSS — this project uses SCSS Modules.
- Add state management libraries without explicit instruction.
- Modify `vite.config.js` SCSS config without explicit instruction.
