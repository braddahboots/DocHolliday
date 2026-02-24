# Template Post-Mortem: DocHolliday

> Feedback from using `braddahboots/claude-agentic-template` on a real project.
> Target: improve the base template for future projects.

## Project Context
- **Project**: DocHolliday — AI-powered PRD generation (Next.js 15 + Anthropic SDK)
- **Template version**: 1.0.0
- **Phases completed**: 0–3 of 8 (foundation through guided interview UI)
- **Date**: 2026-02-24

---

## What Worked Well

### Three-layer enforcement (memory → rules → hooks)
The escalation path proved itself immediately. We discovered `node_modules` isn't persisted between sessions, added it to memory, then promoted it straight to the session-start hook. The mental model is clear and actionable.

### Session-start hook with critical facts
Re-injecting SDK/framework facts at session start is genuinely useful. Long sessions cause context compression, and having the most dangerous pitfalls (e.g., `params` is a Promise in Next.js 15) re-stated prevents regressions.

### Truth file + validation protocol
The "verify before you use" chain (truth file → docs → ask user) caught potential hallucinations early. The post-edit hook running `tsc --noEmit` is a strong safety net.

### Skill-based workflows (/commit, /validate, /review)
Encapsulating workflows as skills keeps agent behavior consistent across sessions. The `/commit` workflow preventing broken code from being committed saved time.

### CODEBASE_OVERVIEW.md
Having a human-readable file map that agents read before touching code measurably reduces scope creep and wrong-file edits.

---

## What Needs Improvement

### 1. Session-start hook should install dependencies
**Problem**: `node_modules/` is not persisted between sessions in cloud/ephemeral environments. Every session starts with a broken build until someone manually runs `npm install`.

**Fix for template**: Add dependency installation to the default `session-start.sh`:
```bash
if [ ! -d "node_modules" ]; then
  echo "### Installing dependencies (node_modules not found)..."
  npm install --no-audit --no-fund 2>&1 | tail -3
fi
```
**Generalization**: The template should detect the package manager (npm/yarn/pnpm/bun) and install accordingly. A `detect-package-manager.sh` utility would help.

### 2. Truth file regeneration should be automatic
**Problem**: The truth file is a STUB until `npm install` runs and `generate-truth-file.sh` is executed. Sessions that start before this happens get no truth file protection.

**Fix for template**: Chain truth file regeneration into session-start after dependency install:
```bash
if [ ! -d "node_modules" ]; then
  npm install --no-audit --no-fund 2>&1 | tail -3
  # Regenerate truth file if script exists
  if [ -f "scripts/generate-truth-file.sh" ]; then
    bash scripts/generate-truth-file.sh ...
  fi
fi
```

### 3. No built-in feedback loop to the template
**Problem**: Learnings from real projects stay in the project's MEMORY.md but never flow back to the template. Each new project starts from scratch without benefiting from past experience.

**Fix for template**: Add a `TEMPLATE_FEEDBACK.md` convention and a post-mortem step in the `/commit` workflow that prompts reflection on template-generalizable improvements after each commit.

### 4. Commit workflow missing /review step
**Problem**: The `/commit` skill doesn't remind or enforce running `/review` first. We had to manually add this to MEMORY.md workflow preferences.

**Fix for template**: Either integrate a review prompt into the commit workflow or document the recommended sequence (implement → /review → /commit) in the commit skill itself.

### 5. Stop hook for uncommitted changes is useful but not in the template
**Problem**: There's a `session-stop.sh` that warns about uncommitted changes, but it only prints a warning. In practice, the user configured an external stop hook that actually blocks.

**Fix for template**: Make the stop hook more assertive — exit non-zero if there are uncommitted `.ts/.tsx/.json` changes, or at minimum make the warning highly visible.

### 6. MEMORY.md "Workflow Preferences" section should be pre-seeded
**Problem**: The template's MEMORY.md has empty sections. The recommended workflow (implement → /review → /commit) was discovered through trial and error.

**Fix for template**: Pre-seed MEMORY.md with the standard workflow:
```markdown
## Workflow Preferences
- **Agent workflow**: implement → `/review` → fix issues → `/commit`
- **Use `/review` before committing** for a second pair of eyes
- **Use `/commit` for validated commits** rather than manual git operations
```

---

## Suggested New Template Features

### Package manager detection utility
A `scripts/detect-pm.sh` that returns `npm`, `yarn`, `pnpm`, or `bun` based on lock file presence. Used by session-start and other hooks.

### Template feedback convention
A `TEMPLATE_FEEDBACK.md` file (gitignored by default in the template, but generated per-project) that accumulates feedback during development. Periodically reviewed and upstreamed.

### Post-commit reflection step
After each commit, a brief check: "Did this commit reveal a pattern that should be in the base template?" Captured in TEMPLATE_FEEDBACK.md.

---

## Summary of Recommended Template Changes

| Priority | Change | Effort |
|----------|--------|--------|
| High | Add `npm install` to session-start.sh | Small |
| High | Auto-regenerate truth file after install | Small |
| Medium | Pre-seed MEMORY.md with workflow preferences | Small |
| Medium | Add /review reminder to /commit workflow | Small |
| Medium | Add post-mortem step to /commit workflow | Small |
| Low | Package manager auto-detection | Medium |
| Low | Template feedback convention (TEMPLATE_FEEDBACK.md) | Small |
