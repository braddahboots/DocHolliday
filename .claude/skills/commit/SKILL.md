---
name: commit
description: Stage changes, run validation, and commit with conventional commit format. Use for clean, validated commits.
allowed-tools: Read, Bash, Glob, Grep, Task, Write, Edit
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
7. **Template post-mortem**: After the commit succeeds, briefly reflect:
   - Did this commit reveal a gap in the base template (`braddahboots/claude-agentic-template`)?
   - Examples: missing hook, rule that should be universal, workflow friction, session-start gap
   - If yes: **overwrite** `TEMPLATE_FEEDBACK.md` with a fresh, self-contained post-mortem for this commit
     - Include: commit hash, date, what was committed, the template gap observed, and a suggested fix
     - The file should be a complete standalone document — the user will feed it to the template repo for review
     - Previous feedback does NOT carry over; each commit gets a clean slate
   - If nothing generalizable: skip silently — don't create noise
   - This step is lightweight — keep it focused on one observation per commit
