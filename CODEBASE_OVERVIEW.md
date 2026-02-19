# Codebase Overview

> This file maps every significant file in the project with a one-sentence description.
> **Read before modifying any file. Update after structural changes.**

## Root
- `CLAUDE.md` — Project-level instructions for Claude Code (system prompt, file ownership table, escalation path)
- `CODEBASE_OVERVIEW.md` — This file. File map with descriptions.
- `ROADMAP.md` — Project status, milestones, decisions, and open questions (template, populated by bootstrap)
- `README.md` — How to use this template
- `.gitignore` — Git ignore rules

## `.claude/` — AI Agent Infrastructure
- `.claude/settings.json` — Permissions, hook definitions, shared config
- `.claude/memory/MEMORY.md` — Cross-session learnings (first 200 lines auto-loaded)

### `.claude/agents/` — Subagent Definitions
- `bootstrap-orchestrator.md` — Reads PRD and generates domain-specific config
- `code-reviewer.md` — Reviews code for correctness (read-only, reports issues)
- `implementer.md` — Implements features (main workhorse)
- `devops.md` — Git operations and CI/CD tasks

### `.claude/rules/` — Contextual Instructions (constraints only, never requirements)
- `source-of-truth.md` — [ALWAYS] Priority order for resolving conflicting info
- `validation-protocol.md` — [ALWAYS] How to verify SDK facts before use
- `scope-discipline.md` — [ALWAYS] Prevents scope creep
- `codebase-maintenance.md` — [ALWAYS] Keep this file current
- `coding-standards.md` — [ALWAYS] Project coding standards (customize after bootstrap)
- `roadmap-discipline.md` — [ALWAYS] File ownership boundaries and escalation path for rules
- `testing.md` — [ALWAYS] Test pyramid and testing rules (static → unit → smoke)

### `.claude/skills/` — Slash-Command Workflows
- `bootstrap/SKILL.md` — `/bootstrap` — Initialize project from PRD
- `commit/SKILL.md` — `/commit` — Validate and commit with conventional format
- `validate/SKILL.md` — `/validate` — Full validation pipeline
- `plan-feature/SKILL.md` — `/plan-feature` — Decompose features into steps
- `review/SKILL.md` — `/review` — Trigger code-reviewer agent on recent changes
- `plan/SKILL.md` — `/plan` — Roadmap-level "what's next" recommendation
- `milestone/SKILL.md` — `/milestone` — Update ROADMAP.md (the only skill that writes to it)
- `status/SKILL.md` — `/status` — Show current milestone, activity, and open questions

### `.claude/scripts/` — Hook Scripts (Deterministic)
- `block-dangerous-commands.sh` — [PreToolUse] Blocks rm -rf, force push, etc.
- `post-edit-check.sh` — [PostToolUse] Truth file cross-ref + type-check after edits
- `session-start.sh` — [SessionStart] Re-injects critical facts
- `session-stop.sh` — [Stop] Warns about uncommitted changes

## `templates/` — Bootstrap Scaffolding Templates
- `agents/domain-implementer.md.tmpl` — Template for domain-specific implementer agents
- `rules/domain-rule.md.tmpl` — Template for SDK constraint rules (constraints only, no requirements)
- `hooks/post-edit-check.sh.tmpl` — Template for post-edit hook configuration
- `hooks/session-start.sh.tmpl` — Template for session-start hook with SDK facts
- `skills/domain-validate.md.tmpl` — Template for domain-specific validation skill

## `examples/` — Example PRDs
- `health-app-prd.md` — Health tracking app example
- `game-sdk-prd.md` — Game with SDK example
- `saas-api-prd.md` — SaaS platform example

## `scripts/` — Utility Scripts
- `setup.sh` — Copies template infrastructure into a target project (excludes examples/ and templates/)
- `generate-truth-file.sh` — Generates truth file from type definitions
- `verify-setup.sh` — Verifies .claude infrastructure is properly set up (files, dirs, permissions, bootstrap status)
- `bootstrap-manual.md` — Fallback guide for manual bootstrap when /bootstrap skill is unavailable
