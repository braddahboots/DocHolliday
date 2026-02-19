#!/bin/bash
# SessionStart hook: Re-inject critical facts
# These facts survive context compression in long sessions

cat << 'EOF'
## Session Start — Critical Facts

### Infrastructure Reminders
- Read CODEBASE_OVERVIEW.md before modifying files
- Read the truth file before using any SDK/framework API
- Check .claude/rules/ for domain-specific rules when working on relevant files
- Scope discipline: only modify files relevant to the current task

### Verification Protocol
1. Truth file → 2. Official docs → 3. Ask user. Never guess.

### Common AI Failure Modes to Avoid
- Do NOT fabricate APIs — if you can't verify it exists, ask
- Do NOT modify unrelated files — stay in scope
- Do NOT self-verify — let hooks and the reviewer agent validate your work
- Do NOT leave wrong code with warning comments — delete fabricated code entirely

EOF

# ============================================
# Bootstrap status detection
# ============================================
if [ -f "PRD.md" ]; then
  # Check if truth file exists (indicator that bootstrap has run)
  TRUTH_FILES=$(find . -maxdepth 1 -name "*-truth.md" 2>/dev/null | wc -l)

  # Check if CLAUDE.md still has template placeholders
  HAS_PLACEHOLDERS=false
  if grep -q "\[populated by bootstrap\]" CLAUDE.md 2>/dev/null; then
    HAS_PLACEHOLDERS=true
  fi

  if [ "$TRUTH_FILES" -eq 0 ] && [ "$HAS_PLACEHOLDERS" = true ]; then
    cat << 'BOOTSTRAP_EOF'

### ⚠ Bootstrap Not Yet Run
PRD.md exists but no domain-specific configuration was found.
Run `/bootstrap` to generate domain-specific rules, agents, hooks, and truth file.
If `/bootstrap` fails with "Unknown skill", see `scripts/bootstrap-manual.md` for fallback options.

BOOTSTRAP_EOF
  fi
fi

# ============================================
# PROJECT-SPECIFIC FACTS (added by bootstrap)
# Add critical SDK/framework facts below that
# the AI commonly gets wrong:
# ============================================
