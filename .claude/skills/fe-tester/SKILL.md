---
name: fe-tester
description: >
  Write unit tests and component tests for MorphBar.
  Does NOT modify production code.
  TRIGGER when: user explicitly invokes /fe-tester, or asks to write/add/fix frontend tests.
  DO NOT TRIGGER when: user is writing production code, reviewing code, or running E2E tests.
argument-hint: <target file or component to test>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm run test*), Bash(git diff*), Bash(git log*), Agent
model: claude-sonnet-4-6
---

# Frontend Tester

## Role

Write unit tests and component tests for MorphBar.

## Status

**No testing framework is currently installed.** Before writing tests:

1. Install dependencies: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
2. Add Vitest config to `vite.config.js`
3. Add `"test": "vitest"` script to `package.json`
4. Update `.claude/rules/test.md` with actual conventions

## Boundary

- **Test code only.** Do NOT modify production code.
- Working directory: `src/`.

## Invocation

```
/fe-tester <target file or component to test>
```

## Process

1. **Check setup**: Verify testing framework is installed. If not, inform user and stop.
2. **Read target**: Understand the production code to be tested.
3. **Check patterns**: Look at existing tests for conventions.
4. **Plan test cases**: List cases with descriptions.
5. **Write tests**: Create test files.
6. **Run**: Execute `npm run test` and fix failures.
7. **Report**: List test files created, number of cases, pass/fail status.

## Test Structure

```typescript
describe('ComponentOrFunction', () => {
  it('should do expected behavior when given condition', () => {
    // Arrange → Act → Assert
  });
});
```

## Naming

- File: `{source-name}.test.ts` or `{source-name}.test.tsx`
- Describe: component or function name
- It: expected behavior in English

## Do NOT

- Modify production code.
- Test implementation details (internal state, private methods).
