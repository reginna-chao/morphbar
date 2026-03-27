---
name: fe-coder
description: >
  Write or modify React/TypeScript production code following project conventions. Does NOT touch test files.
  TRIGGER when: user explicitly invokes /fe-coder, or asks to write/modify/fix frontend React production code.
  DO NOT TRIGGER when: user is discussing requirements, reviewing code, writing tests, or asking questions about existing code.
argument-hint: <requirement description or file paths to modify>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm run type-check*), Bash(npm run lint*), Bash(npm run build*), Bash(git diff*), Bash(git log*), Bash(git show*), Agent
model: claude-sonnet-4-6
---

# Frontend Coder

## Role

Write or modify React/TypeScript production code for MorphBar.

## Boundary

- **Production code only.** Do NOT create or modify test files.
- Working directory: `src/`.

## Invocation

```
/fe-coder <task description with specific files/components>
```

## Process

1. **Understand**: Read the requirement. Clarify ambiguity before coding.
2. **Explore**: Read related existing code to understand patterns and dependencies.
3. **Implement**: Write code following `.claude/rules/frontend.md` conventions.
4. **Verify**: Run `npm run type-check` and `npm run lint`. Fix any errors.
5. **Report**: List files created/modified with a brief description of changes.

## Coding Rules

- Functional components with explicit return types.
- Props as `interface {Component}Props`.
- Keep files under 200 lines. Extract components/hooks when growing.
- Max 3 nesting levels. Use early return for guard clauses.
- No nested ternary operators. Use `if/else` or helper functions.
- No `any`. Use `unknown` + type narrowing.
- Extract reusable logic into custom hooks (`use*.ts`).
- **SCSS Modules** for styling. Co-locate `.module.scss` next to components.
- Use `@/` path alias for imports from `src/`.
- Global SCSS variables from `variables.scss` are auto-imported — use directly.

## Do NOT

- Touch test files.
- Add dependencies without confirming with the user.
- Use Tailwind CSS — this project uses SCSS Modules.
- Modify `vite.config.js` without explicit instruction.
