---
name: plan-feature
description: Decompose a complex feature into sequenced implementation steps. Use when a feature touches multiple files or has dependencies between steps.
allowed-tools: Read, Grep, Glob
---

# Plan Feature Implementation

## Input
Describe the feature you want to implement as `$ARGUMENTS`.

## Steps

1. **Read CODEBASE_OVERVIEW.md** to understand the current architecture
2. **Read relevant domain rules** from `.claude/rules/` for the areas this feature touches
3. **Read the truth file** (if applicable) to verify the SDK features you'll need exist

4. **Decompose the feature** into sequential steps:
   - Each step should be independently committable
   - Each step should leave the project in a working state
   - Dependencies between steps must be clearly stated
   - Estimate complexity: S (< 30 min), M (30-60 min), L (60+ min)

5. **Output the plan** in this format:

   ```
   ## Feature: [name]

   ### Step 1: [title] [S/M/L]
   - Files: [list of files to modify/create]
   - What: [what this step accomplishes]
   - Depends on: [none / step N]
   - Validation: [how to verify this step works]

   ### Step 2: [title] [S/M/L]
   ...
   ```

6. **Flag risks**:
   - Steps that touch shared code
   - Steps that require unverified SDK APIs
   - Steps with potential for scope creep
