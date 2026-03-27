# Global Project Rules — MorphBar

## Project Overview

MorphBar is a frontend-only SPA for designing and generating animated hamburger menu icons. Built with React 19, TypeScript, Vite 7, and SCSS Modules.

## Language & TypeScript

- TypeScript strict mode enabled (`strict: true`, `noUnusedLocals`, `noUnusedParameters`).
- No `any` — use `unknown` + type narrowing.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- Use path alias `@/` for imports from `src/` (e.g., `import { Point } from '@/types'`).

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Preview | `npm run preview` |
| Lint | `npm run lint` |
| Lint fix | `npm run lint:fix` |
| Format | `npm run format` |
| Format check | `npm run format:check` |
| Type check | `npm run type-check` |

## Code Style

- ESLint 9 flat config + Prettier enforced via `eslint-plugin-prettier`.
- Unused vars prefixed with `_` are allowed (`argsIgnorePattern: '^_'`).
- Max file length: 200 lines. Extract when growing.
- Max nesting: 3 levels. Use early return for guard clauses.
- No nested ternary operators.

## Commit Conventions

- Use conventional commit style: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `style:`.
- Keep messages concise (1-2 sentences).

## Decision Framework

- This is a small, focused tool — keep it simple.
- No backend. All logic runs in the browser.
- Prefer vanilla React patterns over adding libraries.
