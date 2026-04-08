# Test Rules — MorphBar

## Status

**No testing framework is currently installed.** This file is a placeholder.

If testing is added in the future, the recommended setup is:

- **Framework**: Vitest (integrates with Vite)
- **Component testing**: @testing-library/react
- **Test location**: `src/__tests__/` or co-located `*.test.ts(x)` files

## Before Writing Tests

1. Install testing dependencies first:
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
   ```
2. Add Vitest config to `vite.config.js`.
3. Add `"test": "vitest"` script to `package.json`.
4. Then update this rules file with actual conventions.
