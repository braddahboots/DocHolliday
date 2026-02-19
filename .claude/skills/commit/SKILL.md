---
name: commit
description: Stage changes, run validation, and commit with conventional commit format. Use for clean, validated commits.
allowed-tools: Read, Bash, Glob, Grep, Task
---

# Commit Workflow

## Steps

1. **Check status**: Run `git status` to see what's changed
2. **Run validation**: Execute `npm run validate`
   - This runs: `npx tsc --noEmit` (type-check) + `npx next lint` (lint) + `npx vitest run` (unit tests) + smoke test
   - If any layer fails, report errors and stop — do not commit broken code
3. **Stage changes**: Run `git add` for the relevant files
   - Only stage files related to the current task
   - If unrelated changes exist, warn the user
4. **Generate commit message**: Use conventional commit format:
   ```
   <type>(<scope>): <short description>

   <optional body>
   ```
5. **Commit**: Run `git commit` with the generated message
6. **Confirm**: Print the commit hash and summary
