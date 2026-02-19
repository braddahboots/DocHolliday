---
name: plan
description: Roadmap-level "what's next" recommendation. Reads ROADMAP.md and PRD.md to recommend the highest-priority task for the current milestone. Use when starting a session or deciding what to work on.
allowed-tools: Read, Glob, Grep
---

# Plan — What's Next

This skill decides WHAT to work on. Use `/plan-feature` to decide HOW to implement it.

## Steps

1. **Read ROADMAP.md** — Identify the current milestone, its tasks, and their status (done/not done).

2. **Read PRD.md** — Understand the full requirements for context on priorities and dependencies.

3. **Check recent git log** (last 10 commits) — Understand what was just completed to avoid recommending already-done work.

4. **Identify the next task** by applying these priority rules in order:
   - **Blocked tasks first** — If an open question in ROADMAP.md blocks a task, recommend resolving the question.
   - **Dependencies first** — If task B depends on task A, recommend task A.
   - **Foundation before features** — Infrastructure/setup tasks before feature implementation.
   - **Smallest unblocked task** — When multiple tasks are equally viable, recommend the smallest one to maintain momentum.

5. **Output a recommendation** in this format:

   ```
   ## Next Up

   ### Recommended: [task name]
   - **Why**: [1-sentence rationale — why this task, why now]
   - **Depends on**: [nothing / list prerequisites]
   - **Blocked by**: [nothing / open question that needs resolution first]
   - **Milestone progress**: [N of M tasks complete]

   ### After That
   - [2nd priority task — 1-sentence description]
   - [3rd priority task — 1-sentence description]

   ### Blockers (if any)
   - [ ] [open question or decision needed before proceeding]
   ```

6. **Do NOT modify any files.** This skill is read-only. Use `/milestone` to update ROADMAP.md.
