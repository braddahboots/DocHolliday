---
name: status
description: Show current project status — active milestone, recent decisions, and open questions from ROADMAP.md. Use to get oriented at the start of a session or check progress.
allowed-tools: Read, Glob, Grep
---

# Project Status

## Steps

1. **Read ROADMAP.md** from the project root to get the current milestone, decisions, and open questions.

2. **Read recent git log** (last 10 commits) to understand recent activity.

3. **Check for uncommitted changes** via git status.

4. **Output a status summary** in this format:

   ```
   ## Project Status

   ### Current Milestone: [name]
   - Goal: [goal]
   - Status: [status]
   - Tasks remaining: [count]

   ### Recent Activity
   - [last 3-5 commits summarized]

   ### Open Questions ([count])
   - [list unresolved questions]

   ### Working Tree
   - [clean / N uncommitted changes]
   ```

5. **Flag any blockers** — open questions that block the next task, or decisions that need to be made.
