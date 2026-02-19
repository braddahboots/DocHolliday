---
name: validate
description: Run the full validation pipeline — type-checking, linting, truth file cross-reference, and optionally trigger the code-reviewer agent.
allowed-tools: Read, Bash, Glob, Grep, Task
---

# Validation Pipeline

## Steps

1. **Type-check**: Run `npx tsc --noEmit`
   - Report all errors with file paths and line numbers

2. **Lint**: Run `npx next lint`
   - Report all warnings and errors

3. **Truth File Cross-Reference** (if `anthropic-sdk-truth.md` exists):
   - Scan all `app/**/*.ts`, `app/**/*.tsx`, `lib/**/*.ts`, and `lib/**/*.tsx` files for imports from `@anthropic-ai/sdk`
   - Cross-reference each import against `anthropic-sdk-truth.md`
   - Report any imports not found in the truth file

4. **Unit Tests**: Run `npx vitest run`
   - Report failures with file paths and test names

5. **Smoke Test**: Run `node scripts/smoke-test.js` (if it exists)
   - Spawns `npm run dev`, waits for "Ready" or "ready" on stdout
   - Reports runtime errors the type-checker cannot catch

6. **Code Review** (optional):
   - If the user requests a full review, spawn the `code-reviewer` agent on changed files
   - Report the reviewer's findings

7. **Summary**: Print a pass/fail summary:
   ```
   Type-check:  PASS
   Lint:        PASS (2 warnings)
   Truth file:  1 unknown import
   Unit tests:  PASS (41 tests)
   Smoke test:  PASS (server started)
   Review:      Not requested (use /validate --review to include)
   ```
