# Project Configuration

## Quick Reference
- **Template Version**: 1.0.0
- **Bootstrap Status**: Check if `PRD.md` exists and `.claude/rules/` contains domain-specific rules
- **Codebase Map**: See `CODEBASE_OVERVIEW.md` — read before modifying any file, update after structural changes

## Core Principles

### File Ownership

Each type of content has exactly one owner. When information conflicts or you're unsure where something belongs, use this table:

| Content | Owned by | Read by |
|---------|----------|---------|
| Requirements (what to build) | `PRD.md` | agents, `/plan`, `/plan-feature` |
| Status, milestones, decisions, open questions | `ROADMAP.md` | agents, `/status`, `/plan`, `/milestone` |
| Behavioral constraints (what NOT to do) | `.claude/rules/` | agents during implementation |
| Cross-session learnings | `.claude/memory/MEMORY.md` | agents (auto-loaded first 200 lines) |
| File structure & purposes | `CODEBASE_OVERVIEW.md` | agents before any file modification |
| SDK/framework API reference | `*-truth.md` | agents, post-edit hooks |

### Three-Layer Enforcement Model
1. **Memory** (`MEMORY.md`) — Cross-session learnings. First 200 lines auto-loaded. Learning layer.
2. **Rules** (`.claude/rules/`) — Active instructions. Always-on globals + path-matched domain rules. Instruction layer.
3. **Hooks** (`.claude/scripts/`) — Shell scripts on lifecycle events. Cannot be skipped. Guarantee layer.

### Escalation Path — Rules Are Earned, Not Pre-Generated

```
AI mistake happens once       → add to MEMORY.md
Same mistake recurs           → promote to a rule in .claude/rules/
Mistake is dangerous/critical → enforce with a hook in .claude/scripts/
```

Domain-specific rules should emerge organically through this path. The bootstrap only generates universal rules + one SDK rule. All other rules are created when patterns prove they need enforcement.

**The Rule Litmus Test:** Rule files must contain ONLY behavioral constraints — never requirements, implementation plans, or open questions. If deleting a rule wouldn't make the agent produce worse code, it doesn't belong.

### Source-of-Truth Hierarchy
When information conflicts, resolve using this priority order:
1. **Compiler/type-checker output** — highest authority (deterministic)
2. **Truth file** (`*-truth.md`) — auto-generated from type definitions
3. **Official documentation** (via MCP or web)
4. **Rules** (`.claude/rules/`)
5. **Memory** (`.claude/memory/MEMORY.md`)
6. **AI training knowledge** — lowest authority (may hallucinate)

### Testing Model
Three verification layers, each catching what the previous misses:
1. **Static analysis** (type-check + truth file) — compile-time correctness
2. **Unit tests** (mocked dependencies) — logic correctness
3. **Smoke test** (real runtime) — runtime correctness

All three run in the project's `validate` script and gate `/commit`.

### Scope Discipline
- **Only modify files explicitly relevant to the current task**
- **Never add features that weren't requested**
- **If a change requires modifying more than 3 files, pause and confirm the plan with the user**
- **Read CODEBASE_OVERVIEW.md before touching any file** to understand dependencies

### Verification Protocol
Before using any SDK/framework API:
1. Check the truth file for existence (cite file + line number)
2. If not in truth file, check official docs via MCP or web
3. If still uncertain, ask the user — never guess
4. After implementation, the post-edit hook will verify imports automatically

## Available Skills
- `/bootstrap` — Analyze a PRD and generate domain-specific .claude configuration
- `/commit` — Stage, validate, and commit with conventional commit format
- `/validate` — Run the full validation pipeline (type-check, truth-file cross-reference, unit tests, smoke test)
- `/plan` — Roadmap-level "what's next" — recommends the highest-priority task from ROADMAP.md
- `/plan-feature` — Code-level decomposition — breaks a specific feature into sequenced steps
- `/milestone` — Update ROADMAP.md — check off tasks, record decisions, advance milestones
- `/review` — Trigger the code-reviewer agent on recent changes
- `/status` — Show current milestone, recent activity, open questions from ROADMAP.md

**Skill hierarchy:** `/plan` decides WHAT to work on next, `/plan-feature` decides HOW to implement it, `/milestone` records progress.

## Available Agents
- `bootstrap-orchestrator` — Reads PRD, generates domain-specific agents/rules/hooks/skills
- `code-reviewer` — Reviews code for correctness, type safety, scope. Reports only, does NOT fix.
- `implementer` — Implements features. The main workhorse. Reads truth file first.
- `devops` — Git operations, commits, CI/CD. Lightweight procedural tasks.

## Project-Specific Configuration

- **Project**: PRDGen AI — AI-powered PRD generation via guided conversation
- **Tech Stack**: Next.js 15 (App Router), TypeScript (strict), React 19, Tailwind CSS
- **Primary SDK**: `@anthropic-ai/sdk` v0.68.x (Anthropic Claude TypeScript SDK)
- **Secondary (future)**: GPT-4o via OpenAI SDK (post-MVP)
- **Hosting**: Vercel
- **Truth File Location**: `anthropic-sdk-truth.md` (STUB until `npm install` — see regeneration command below)
- **SDK Rule**: `.claude/rules/nextjs-anthropic-sdk.md` (the ONE SDK-specific rule)

### Commands
- **Type-check**: `npx tsc --noEmit`
- **Lint**: `npx next lint`
- **Unit Tests**: `npx vitest run`
- **Smoke Test**: `node scripts/smoke-test.js`
- **Full Validate**: `npm run validate` (chains: type-check + lint + unit tests + smoke test)
- **Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Truth File Regeneration**: `bash scripts/generate-truth-file.sh node_modules/@anthropic-ai/sdk/index.d.ts anthropic-sdk-truth.md --format ts`

### Architecture
- **Pattern**: Full-stack monolith (Next.js App Router)
- **Frontend**: React Server Components + Client Components in `app/`
- **Backend**: Next.js API Route Handlers in `app/api/`
- **AI Integration**: Anthropic SDK calls in API routes only (server-side)
- **State**: Conversation state managed client-side (React state), no database for MVP

### Key Entities
- **Session** — A conversation between user and AI to generate a PRD
- **Message** — A single turn in the conversation (user prompt or AI response)
- **PRD** — The generated Product Requirements Document (structured Markdown)
- **QualityScore** — 0-10 score with per-category breakdowns (clarity, completeness, testability, AI-readiness)
- **ChecklistItem** — A tracked item in the PRD completeness checklist

### Environment Variables
- `ANTHROPIC_API_KEY` — Required. The Anthropic API key for Claude access.
- `NEXT_PUBLIC_*` — Only for values safe to expose to the browser.
