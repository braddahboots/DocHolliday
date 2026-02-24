#!/bin/bash
# SessionStart hook: Install deps + re-inject critical facts
# These facts survive context compression in long sessions

# ============================================
# Dependency installation (node_modules not persisted between sessions)
# ============================================
if [ ! -d "node_modules" ]; then
  echo "### Installing dependencies (node_modules not found)..."
  npm install --no-audit --no-fund 2>&1 | tail -3
  echo ""
fi

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
# PROJECT-SPECIFIC FACTS (DocHolliday — Next.js + Anthropic SDK)
# ============================================

cat << 'SDK_EOF'

### Anthropic SDK Critical Facts (@anthropic-ai/sdk v0.68.x)
- Default import: `import Anthropic from '@anthropic-ai/sdk'`
- Core method: `client.messages.create({ model, max_tokens, messages })` — all three params required
- System prompt is a TOP-LEVEL parameter `system: "..."`, NOT a message with `role: 'system'`
- Response: `message.content` is an ARRAY of content blocks, not a string. Use `message.content[0].text`
- Streaming option A: `client.messages.create({ ..., stream: true })` — raw SSE events
- Streaming option B: `client.messages.stream({ ... })` — helper with `.on('text', cb)` and `.finalMessage()`
- DOES NOT EXIST: `client.chat()`, `client.completions`, `role: 'system'`, `Anthropic.Models` enum
- All Anthropic calls MUST be server-side only (API routes or Server Actions). Never call from client code.

### Next.js 15 App Router Critical Facts
- `params` in dynamic routes is a Promise — always `await params` in async page functions
- `searchParams` in pages is also a Promise
- `redirect()` throws internally — NEVER use inside try/catch
- Files in `app/` are Server Components by default — only add `"use client"` for hooks/events/browser APIs
- API routes: `app/api/.../route.ts` exporting GET, POST, etc.

SDK_EOF
