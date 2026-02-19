# Roadmap Discipline

## File Ownership

Each type of content has exactly one owner file. When you encounter content, put it in the right place:

| Content | Owned by | Read by |
|---------|----------|---------|
| Requirements (what to build) | `PRD.md` | agents, `/plan`, `/plan-feature` |
| Status, decisions, open questions | `ROADMAP.md` | agents, `/status`, `/plan`, `/milestone` |
| Behavioral constraints (what NOT to do) | `.claude/rules/` | agents during implementation |
| Cross-session learnings | `.claude/memory/MEMORY.md` | agents (auto-loaded) |
| File structure & purposes | `CODEBASE_OVERVIEW.md` | agents before any file modification |

## Rules

1. **Never put requirements in rule files.** If you're describing what to build rather than how to avoid building it wrong, it belongs in PRD.md.

2. **Never put open questions in rule files.** Open questions and decision records belong in ROADMAP.md.

3. **Never put implementation plans in rule files.** Implementation plans are the output of `/plan-feature` and are transient — they don't persist as rules.

4. **Read ROADMAP.md at session start** to understand current milestone, open questions, and recent decisions.

5. **Use `/milestone` to update ROADMAP.md** — it is the only skill that writes to ROADMAP.md. Use it to check off tasks, record decisions, and resolve open questions.

6. **Rules are earned, not pre-generated.** Domain-specific rules should emerge through the escalation path:
   - AI mistake happens once → add to `MEMORY.md`
   - Same mistake recurs → promote to a rule in `.claude/rules/`
   - Mistake is dangerous → enforce with a hook in `.claude/scripts/`
