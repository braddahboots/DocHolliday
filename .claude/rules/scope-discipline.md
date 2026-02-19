---
description: Prevents scope creep and unintended modifications
globs: "**/*"
---

# Scope Discipline

## Rules

1. **Only modify files directly relevant to the current task.** If a file isn't mentioned in the task description and isn't a direct dependency of the change, don't touch it.

2. **Never add features that weren't requested.** Even if you notice something that "could be improved" — flag it as a suggestion, don't implement it.

3. **If a change requires modifying more than 3 files, stop.** Present your plan to the user and get confirmation before proceeding. Exception: if the user explicitly requested a large refactor.

4. **Read CODEBASE_OVERVIEW.md first.** Before modifying any file, understand what it does and what depends on it.

5. **Update CODEBASE_OVERVIEW.md after structural changes.** If you create, rename, or delete files, update the overview.

6. **One task, one commit.** Don't bundle unrelated changes into a single commit.

7. **Prefer simple over clever.** Use built-in SDK/framework features before writing custom implementations. If the SDK provides a method, use it. Don't reinvent.
