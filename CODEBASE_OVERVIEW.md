# Codebase Overview

> This file maps every significant file in the project with a one-sentence description.
> **Read before modifying any file. Update after structural changes.**

## Root
- `CLAUDE.md` — Project-level instructions for Claude Code (system prompt, file ownership, project config)
- `CODEBASE_OVERVIEW.md` — This file. File map with descriptions.
- `PRD.md` — Product Requirements Document for DocHolliday (the product being built)
- `ROADMAP.md` — Project status, milestones, decisions, and open questions
- `README.md` — Repository README for DocHolliday
- `.gitignore` — Git ignore rules (node_modules, .env, truth files, IDE files)
- `anthropic-sdk-truth.md` — SDK truth file for `@anthropic-ai/sdk` (generated from installed SDK types)
- `package.json` — Project manifest: dependencies, scripts (dev, build, lint, typecheck, test, smoke, validate)
- `tsconfig.json` — TypeScript configuration (strict mode enabled, bundler resolution, path aliases)
- `next.config.ts` — Next.js configuration (currently default)
- `postcss.config.mjs` — PostCSS configuration for Tailwind CSS v4
- `eslint.config.mjs` — ESLint 9 flat config with next/core-web-vitals and next/typescript
- `vitest.config.ts` — Vitest configuration (node environment, path aliases, tests in tests/)
- `.env.example` — Template for required environment variables

## `scripts/` — Utility Scripts
- `scripts/generate-truth-file.sh` — Generates truth file from TypeScript type definitions
- `scripts/smoke-test.js` — Smoke test: spawns Next.js dev server, checks for ready signal, exits 0/1

## `.claude/` — AI Agent Infrastructure
- `.claude/settings.json` — Permissions, hook definitions, shared config
- `.claude/memory/MEMORY.md` — Cross-session learnings (first 200 lines auto-loaded)

### `.claude/agents/` — Subagent Definitions
- `bootstrap-orchestrator.md` — Reads PRD and generates domain-specific config
- `code-reviewer.md` — Reviews code for correctness, including Anthropic SDK and Next.js-specific checks
- `implementer.md` — Implements features for DocHolliday (Next.js + Anthropic SDK)
- `devops.md` — Git operations, Vercel deployments, CI/CD tasks

### `.claude/rules/` — Contextual Instructions (constraints only, never requirements)
- `validation-protocol.md` — [ALWAYS] How to verify SDK facts before use
- `scope-discipline.md` — [ALWAYS] Prevents scope creep
- `codebase-maintenance.md` — [ALWAYS] Keep this file current
- `coding-standards.md` — [ALWAYS] TypeScript + Next.js + React coding standards
- `roadmap-discipline.md` — [ALWAYS] File ownership boundaries and escalation path for rules
- `testing.md` — [ALWAYS] Test pyramid and testing rules (static, unit, smoke)
- `nextjs-anthropic-sdk.md` — [*.ts, *.tsx] Constraints for Next.js App Router + Anthropic SDK usage

### `.claude/skills/` — Slash-Command Workflows
- `bootstrap/SKILL.md` — `/bootstrap` — Initialize project from PRD
- `commit/SKILL.md` — `/commit` — Validate (`npm run validate`) and commit with conventional format
- `validate/SKILL.md` — `/validate` — Full pipeline: tsc + next lint + vitest + smoke test
- `plan-feature/SKILL.md` — `/plan-feature` — Decompose features into steps
- `review/SKILL.md` — `/review` — Trigger code-reviewer with Anthropic/Next.js-specific checks
- `plan/SKILL.md` — `/plan` — Roadmap-level "what's next" recommendation
- `milestone/SKILL.md` — `/milestone` — Update ROADMAP.md (the only skill that writes to it)
- `status/SKILL.md` — `/status` — Show current milestone, activity, and open questions

### `.claude/scripts/` — Hook Scripts (Deterministic)
- `block-dangerous-commands.sh` — [PreToolUse] Blocks rm -rf, force push, Vercel destructive commands
- `post-edit-check.sh` — [PostToolUse] Anthropic SDK truth file cross-ref + TypeScript type-check after edits
- `session-start.sh` — [SessionStart] Re-injects Anthropic SDK and Next.js 15 critical facts
- `session-stop.sh` — [Stop] Warns about uncommitted .ts/.tsx/.json changes

## `app/` — Next.js App Router
- `app/layout.tsx` — Root layout with Geist fonts and global CSS
- `app/page.tsx` — Landing page with hero section and CTA
- `app/globals.css` — Global styles (Tailwind CSS v4 import)

## `tests/` — Unit Tests (Vitest)
- `tests/setup.test.ts` — Project setup verification test (tsconfig strict mode)

## Not Yet Created
> The following directories will be created as features are implemented:
> - `app/api/` — API route handlers (Anthropic SDK calls)
> - `components/` — Shared React components
> - `lib/` — Shared utilities, types, constants
> - `lib/types/` — TypeScript type definitions (Session, Message, PRD, QualityScore, etc.)
> - `public/` — Static assets
