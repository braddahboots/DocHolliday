---
description: Rules for maintaining the CODEBASE_OVERVIEW.md file map
globs: "**/*"
---

# Codebase Maintenance

## CODEBASE_OVERVIEW.md Protocol

`CODEBASE_OVERVIEW.md` is the project's file map. It lists every significant file with a one-sentence description of its purpose.

### Before Modifying Code
1. Read `CODEBASE_OVERVIEW.md` to understand the current structure
2. Identify which files are relevant to your task
3. Check for dependencies between files

### After Structural Changes
If you created, renamed, moved, or deleted any files:
1. Update `CODEBASE_OVERVIEW.md` to reflect the change
2. Update descriptions of affected files
3. Ensure directory groupings are still accurate

### Format
```
## Directory: src/
- `src/index.ts` — Application entry point, initializes server and loads config
- `src/router.ts` — HTTP route definitions, maps endpoints to handlers
```

Keep descriptions to one sentence. Focus on purpose, not implementation details.
