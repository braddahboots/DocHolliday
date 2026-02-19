---
name: milestone
description: Update ROADMAP.md — check off tasks, record decisions, resolve open questions, advance milestones. The ONLY skill that writes to ROADMAP.md.
allowed-tools: Read, Edit, Grep, Glob
---

# Milestone — Update Project Roadmap

This is the **only** skill that writes to `ROADMAP.md`. All other skills and agents read it but never modify it.

## Input
Describe the update as `$ARGUMENTS`. Examples:
- `/milestone complete "Set up project scaffolding"`
- `/milestone decide "Use WebSocket for real-time" because "lower latency than polling"`
- `/milestone resolve "Which auth provider?" with "Clerk — team already has experience"`
- `/milestone advance` (move to next milestone)

## Steps

1. **Read ROADMAP.md** to understand the current state.

2. **Determine the update type** from the arguments:

   ### Check off a task
   - Find the task in the current milestone's task list
   - Mark it as complete (e.g., `- [x] task name`)
   - If all tasks in the milestone are complete, suggest running `/milestone advance`

   ### Record a decision
   - Add a row to the Decisions table: `| [decision] | [rationale] | [today's date] |`
   - If this decision resolves an open question, also check off that question

   ### Resolve an open question
   - Find the question in the Open Questions section
   - Mark it as resolved: `- [x] [question] → [resolution]`

   ### Advance to next milestone
   - Move the current milestone to the "Completed" section
   - Set up the next milestone from PRD.md as the new "Current Milestone"
   - If no more milestones exist in the PRD, note that the project roadmap needs extension

3. **Edit ROADMAP.md** with the update.

4. **Output a confirmation** in this format:

   ```
   ## Roadmap Updated

   **Action**: [what was done]
   **Milestone progress**: [N of M tasks complete]
   **Next recommended action**: [use /plan to decide what's next / all tasks done — consider /milestone advance]
   ```

## Constraints

- **Only modify ROADMAP.md** — never touch PRD.md, rule files, or any other file.
- **Never add tasks** — tasks come from the PRD via `/bootstrap` or are added manually by the user.
- **Never rewrite the file** — use targeted edits to change specific lines.
- **Preserve the existing format** — don't restructure sections or change headers.
