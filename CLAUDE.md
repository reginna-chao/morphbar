# CLAUDE.md — MorphBar

## Project Overview

MorphBar is a frontend-only SPA for designing and generating animated hamburger-to-close menu icons. Users drag SVG control points to customize shapes, preview animations in real-time, and export production-ready HTML/CSS/JS code.

Live demo: https://reginna-chao.github.io/morphbar/

## Tech Stack

- **React 19** + **TypeScript** (strict mode)
- **Vite 7** (bundler + dev server)
- **SCSS Modules** (`.module.scss`) for component-scoped styling
- **lucide-react** for icons, **react-toastify** for notifications, **react-tooltip** for tooltips
- No backend, no state management library, no testing framework

## Project Structure

```
src/
├── App.tsx                     # Root component, holds all top-level state
├── main.tsx                    # Entry point
├── components/                 # Feature components (co-located .module.scss)
│   ├── EditorCanvas.tsx        # SVG editor with draggable points
│   ├── ControlsSidebar.tsx     # Settings panel (size, colors, method)
│   ├── CodePanel.tsx           # Generated code output
│   ├── Preview.tsx             # Live animation preview
│   ├── Toolbar.tsx             # Tool selection bar
│   ├── LineManager.tsx         # Line add/remove/color management
│   ├── ThemeToggle.tsx         # Light/dark mode toggle
│   └── ui/                     # Reusable primitives (Button, SegmentedControl)
├── types/index.ts              # All TypeScript interfaces (Point, LineState, Mode, etc.)
├── utils/
│   ├── generator.ts            # HTML/CSS/JS code generation logic
│   └── colors.ts               # Color utilities
├── config/toast.ts             # Toast notification config
└── styles/
    ├── global.scss             # Global styles
    └── variables.scss          # SCSS variables (auto-imported via Vite)
```

## Key Concepts

- **Lines**: Array of `LineState`, each with `menu` and `close` path points (Bezier curves)
- **Mode**: `'menu' | 'close'` — which animation state is being edited
- **Method**: `'checkbox' | 'class'` — how the generated toggle works
- **PathPoint**: `{ x, y, type: 'anchor' | 'control' }` — SVG path control points

## Commands

```bash
npm run dev           # Start dev server (localhost:5173)
npm run build         # Production build → dist/
npm run preview       # Preview production build
npm run type-check    # TypeScript check (tsc --noEmit)
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier format
npm run format:check  # Prettier check
```

## Conventions

- **Path alias**: `@/` maps to `src/` — use for all imports
- **SCSS Modules**: Every component has a co-located `.module.scss` file
- **SCSS variables**: Defined in `variables.scss`, auto-imported globally via Vite config — use directly without `@use`
- **No Tailwind**: This project uses SCSS Modules exclusively
- **Strict TypeScript**: No `any`, no unused vars (prefix with `_` if intentionally unused)
- **Commit style**: Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)

## Skills

This project has Claude Code skills in `.claude/skills/`:

- `/fe-team-lead` — Orchestrate full dev cycle (spec → code → test → review)
- `/fe-coder` — Write/modify production code
- `/fe-tester` — Write tests (placeholder — no test framework yet)
- `/fe-review` — Structured code review (read-only)
- `/project-init` — Re-adapt skills/rules to project changes
