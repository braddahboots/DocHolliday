#!/bin/bash
# Verify .claude infrastructure is properly set up
# Run this after copying template files and before running /bootstrap
# Also useful after bootstrap to verify everything was generated

set -euo pipefail

ERRORS=0
WARNINGS=0

echo "=== Claude Infrastructure Setup Verification ==="
echo ""

# --- Required files ---
echo "Checking required files..."
for file in CLAUDE.md CODEBASE_OVERVIEW.md; do
  if [ ! -f "$file" ]; then
    echo "  MISSING: $file"
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: $file"
  fi
done

# PRD is required for bootstrap but not for general operation
if [ ! -f "PRD.md" ]; then
  echo "  NOTE: PRD.md not found. Required if you plan to run /bootstrap."
  WARNINGS=$((WARNINGS + 1))
else
  echo "  OK: PRD.md"
fi
echo ""

# --- Directory structure ---
echo "Checking .claude/ directory structure..."
for dir in .claude/agents .claude/rules .claude/skills .claude/scripts .claude/memory; do
  if [ ! -d "$dir" ]; then
    echo "  MISSING DIR: $dir"
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: $dir/"
  fi
done
echo ""

# --- Core skill files ---
echo "Checking skill definitions..."
for skill in bootstrap commit validate plan-feature review; do
  if [ ! -f ".claude/skills/$skill/SKILL.md" ]; then
    echo "  MISSING: .claude/skills/$skill/SKILL.md"
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: /  $skill"
  fi
done
echo ""

# --- Hook scripts ---
echo "Checking hook scripts..."
for script in block-dangerous-commands.sh post-edit-check.sh session-start.sh session-stop.sh; do
  if [ ! -f ".claude/scripts/$script" ]; then
    echo "  MISSING: .claude/scripts/$script"
    ERRORS=$((ERRORS + 1))
  elif [ ! -x ".claude/scripts/$script" ]; then
    echo "  NOT EXECUTABLE: .claude/scripts/$script — Run: chmod +x .claude/scripts/$script"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "  OK: $script"
  fi
done
echo ""

# --- Settings file ---
echo "Checking settings..."
if [ ! -f ".claude/settings.json" ]; then
  echo "  MISSING: .claude/settings.json (hooks won't fire without this)"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: .claude/settings.json"
fi
echo ""

# --- Agent definitions ---
echo "Checking agent definitions..."
for agent in bootstrap-orchestrator implementer code-reviewer devops; do
  if [ ! -f ".claude/agents/$agent.md" ]; then
    echo "  MISSING: .claude/agents/$agent.md"
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: $agent"
  fi
done
echo ""

# --- Bootstrap completion checks ---
echo "Checking bootstrap completion..."

# Check for domain-specific rules (beyond the template defaults)
DEFAULT_RULES="source-of-truth.md validation-protocol.md scope-discipline.md codebase-maintenance.md coding-standards.md"
DOMAIN_RULES=0
if [ -d ".claude/rules" ]; then
  for rule_file in .claude/rules/*.md; do
    [ -f "$rule_file" ] || continue
    BASENAME=$(basename "$rule_file")
    IS_DEFAULT=false
    for default in $DEFAULT_RULES; do
      if [ "$BASENAME" = "$default" ]; then
        IS_DEFAULT=true
        break
      fi
    done
    if [ "$IS_DEFAULT" = false ]; then
      DOMAIN_RULES=$((DOMAIN_RULES + 1))
    fi
  done
fi

if [ "$DOMAIN_RULES" -eq 0 ]; then
  echo "  NOTE: No domain-specific rules found. Run /bootstrap to generate them."
  WARNINGS=$((WARNINGS + 1))
else
  echo "  OK: $DOMAIN_RULES domain-specific rule(s) found"
fi

# Check for truth file
TRUTH_FILES=$(find . -maxdepth 1 -name "*-truth.md" 2>/dev/null | wc -l)
if [ "$TRUTH_FILES" -eq 0 ]; then
  echo "  NOTE: No truth file found (*-truth.md). Bootstrap may not have run, or your project may not use a typed SDK."
  WARNINGS=$((WARNINGS + 1))
else
  echo "  OK: Truth file found"
fi

# Check if CLAUDE.md has been configured (not still template defaults)
if grep -q "\[populated by bootstrap\]" CLAUDE.md 2>/dev/null; then
  echo "  NOTE: CLAUDE.md still contains template placeholders. Run /bootstrap to configure."
  WARNINGS=$((WARNINGS + 1))
else
  echo "  OK: CLAUDE.md appears configured"
fi

# --- Utility scripts ---
echo ""
echo "Checking utility scripts..."
if [ ! -f "scripts/generate-truth-file.sh" ]; then
  echo "  MISSING: scripts/generate-truth-file.sh"
  ERRORS=$((ERRORS + 1))
elif [ ! -x "scripts/generate-truth-file.sh" ]; then
  echo "  NOT EXECUTABLE: scripts/generate-truth-file.sh — Run: chmod +x scripts/generate-truth-file.sh"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  OK: generate-truth-file.sh"
fi

# --- jq dependency ---
echo ""
echo "Checking dependencies..."
if ! command -v jq &> /dev/null; then
  echo "  MISSING: jq (required by hook scripts)"
  echo "  Install: brew install jq (macOS) | apt install jq (Linux) | choco install jq (Windows)"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  OK: jq"
fi

# --- Summary ---
echo ""
echo "=== Summary ==="
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo "All checks passed. Infrastructure is ready."
elif [ "$ERRORS" -eq 0 ]; then
  echo "$WARNINGS warning(s). Infrastructure is functional but may need attention."
else
  echo "$ERRORS error(s), $WARNINGS warning(s). Fix errors before proceeding."
fi

exit $ERRORS
