---
name: review
description: Trigger the code-reviewer agent on recent changes. Use for pre-commit review or when you want a second opinion on code quality.
allowed-tools: Read, Bash, Glob, Grep, Task
---

# Code Review Workflow

## Steps

1. **Identify changes**: Run `git diff` to see uncommitted changes, or `git diff HEAD~1` for the last commit
2. **List affected files**: Extract the file paths from the diff
3. **Spawn code-reviewer agent**: Delegate to the `code-reviewer` agent with the list of changed files and a summary of what was changed
4. **Report findings**: Present the reviewer's output to the user, organized by severity:
   - Blocking issues (must fix before commit)
   - Warnings (should fix, but not blocking)
   - Approved items (looks good)
   - Scope assessment (clean vs scope creep)

## Usage
- `/review` — Review all uncommitted changes
- `/review HEAD~1` — Review the last commit
- `/review path/to/file.ts` — Review a specific file
