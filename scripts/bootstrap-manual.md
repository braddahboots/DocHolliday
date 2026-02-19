# Manual Bootstrap Guide

Use this guide if the `/bootstrap` skill is unavailable (e.g., because `.claude/` was copied during an active session and skills weren't loaded).

## Option 1: Paste This Prompt Into Claude Code

Copy and paste the following into your Claude Code session:

---

```
Read the PRD at PRD.md and the bootstrap orchestrator spec at .claude/agents/bootstrap-orchestrator.md.
Follow the orchestrator's full workflow to generate domain-specific .claude configuration.

Execute all 8 steps in order:
1. Analysis — Extract tech stack, domain, entities, risks from the PRD
2. Rules — Generate domain-specific rules in .claude/rules/
3. Agents — Create domain-specific implementer agents in .claude/agents/
4. Hooks — Configure hook scripts in .claude/scripts/ for the project's build tools
5. Truth File — Auto-detect type definitions and run scripts/generate-truth-file.sh
6. Skills — Adapt /validate and other skills for the project's toolchain
7. Memory — Initialize .claude/memory/MEMORY.md with SDK gotchas
8. Config — Update CLAUDE.md with project-specific config and rewrite CODEBASE_OVERVIEW.md
```

---

## Option 2: Invoke the Orchestrator as a Task Agent

If you're familiar with Claude Code's Task tool, you can spawn the orchestrator directly:

```
Use the Task tool to spawn the bootstrap-orchestrator agent with this prompt:
"Read the PRD at PRD.md and generate a complete domain-specific .claude configuration.
Follow your full workflow: Analysis → Rules → Agents → Hooks → Truth File → Skills → Memory → CLAUDE.md → CODEBASE_OVERVIEW.md"
```

## Option 3: Restart and Use the Skill

The simplest fix is often just restarting Claude Code:

1. Close your current Claude Code session
2. Start a new session in your project directory
3. Run `/bootstrap`

Skills are loaded at session startup. A fresh session will pick up the `.claude/skills/` directory.

## What Bootstrap Produces

After a successful bootstrap, you should have:

| Category | Location | Description |
|----------|----------|-------------|
| Domain rules | `.claude/rules/` | Tech-stack and domain-specific instructions |
| Domain agents | `.claude/agents/` | Specialized implementer agents for your project |
| Hook configs | `.claude/scripts/` | Build commands, truth file paths, dangerous command patterns |
| Truth file | `<sdk>-truth.md` | Auto-generated API reference from type definitions |
| Skills | `.claude/skills/` | Validation skill configured for your toolchain |
| Memory | `.claude/memory/MEMORY.md` | SDK gotchas and infrastructure lessons |
| Config | `CLAUDE.md` | Project-specific build/test/lint commands |
| File map | `CODEBASE_OVERVIEW.md` | One-sentence descriptions of every project file |

## Verifying Bootstrap Completion

Run the verification script to check if everything was generated:

```bash
bash scripts/verify-setup.sh
```
