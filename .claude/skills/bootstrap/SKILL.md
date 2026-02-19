---
name: bootstrap
description: Analyze a PRD (Product Requirements Document) and generate domain-specific .claude configuration for the project. Run this when initializing a new project.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch, Task
---

# Bootstrap Project from PRD

## Prerequisites
- A file named `PRD.md` must exist in the project root
- Or pass the PRD path as an argument: `/bootstrap path/to/my-prd.md`

## Steps

1. **Locate PRD**: Read `PRD.md` from the project root (or the path provided as `$ARGUMENTS`)

2. **Delegate to Bootstrap Orchestrator**: Use the Task tool to spawn the `bootstrap-orchestrator` agent with the following prompt:

   > Read the PRD at [path] and generate a complete domain-specific .claude configuration. Follow your full workflow: Analysis → Rules (universals + ONE SDK rule only) → Agents → Hooks → Truth File → Skills → Memory → CLAUDE.md → ROADMAP.md → CODEBASE_OVERVIEW.md

3. **Review Output**: After the orchestrator completes, verify:
   - [ ] Universal rules exist in `.claude/rules/` (scope, validation, coding standards, codebase maintenance)
   - [ ] At most ONE SDK-specific rule was created (no per-domain rule files)
   - [ ] Domain agents were created/updated in `.claude/agents/`
   - [ ] Hook scripts were configured in `.claude/scripts/`
   - [ ] Truth file was generated (if applicable)
   - [ ] `CLAUDE.md` was updated with project-specific configuration
   - [ ] `ROADMAP.md` was initialized with milestone, decisions, and open questions
   - [ ] `CODEBASE_OVERVIEW.md` was created
   - [ ] `MEMORY.md` was initialized
   - [ ] No rule file contains requirements, implementation plans, or open questions (these belong in PRD.md and ROADMAP.md)

4. **Report**: Print a summary of what was generated and any manual steps needed.
