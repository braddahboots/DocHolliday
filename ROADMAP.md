# Project Roadmap

> **Owner of**: Project status, milestones, decisions, and open questions.
> **Read by**: Agents, `/status`, `/plan`, `/plan-feature`
> **Updated by**: `/milestone` skill (the only skill that writes here).

## Current Milestone

**Milestone**: MVP — Core PRD Generation Flow (Phases 0–7)
**Goal**: User inputs a rough idea, receives guided AI interview, and exports a structured, scored, scenario-validated NLSpec PRD optimized for AI coding agents.
**Status**: Not started
**PRD Version**: 2.0 (NLSpec paradigm, Feb 19 2026)

### Phase 0: Project Foundation + Research ✓
**Dependencies:** None
- [x] Initialize Next.js 14+ App Router with TypeScript strict, Tailwind CSS, ESLint
- [x] Set up Vercel deployment pipeline (push to `main` → live within 3 min)
- [x] Create landing page rendering at localhost:3000
- [x] Research + document Cursor vs Claude Code spec format differences (≥3 concrete differences with examples)
- [x] Wire up `npm run validate` with type-check, lint, unit tests, smoke test

### Phase 1: Data Model + Session State ✓
**Dependencies:** Phase 0
- [x] Define TypeScript types/interfaces: PRDSession, ChecklistState, ChecklistSection, ConversationMessage, GeneratedPRD, QualityScore, QualityIssue, ExportRecord
- [x] Implement session state management via React Context + useReducer
- [x] Implement weighted completion percentage calculation (by section weight, not simple count)
- [x] Implement localStorage persistence with auto-save on every state change
- [x] Implement session recovery (detect saved session on load, offer resume or fresh start)

### Phase 2: Checklist Engine + Gap Detection ✓
**Dependencies:** Phase 1
- [x] Create ChecklistEngine module with LLM-powered gap analysis
- [x] Implement structured prompt for section-by-section evaluation (addressed/confidence/extractedData/gaps)
- [x] Implement question prioritization: required sections first, then by weight descending
- [x] Handle malformed LLM JSON: retry once with simplified prompt, fallback to all-pending
- [x] Show loading state with progress indicator during gap detection (non-blocking UI via API route)

### Phase 3: Guided Interview UI + Conversation Flow ✓
**Dependencies:** Phase 1, Phase 2
- [x] Build chat interface: message history, input field, send button, loading states
- [x] Build checklist progress sidebar (left panel, 30% width) with status icons and weights
- [x] Implement conversation state machine: START → QUESTION_PRESENTED → CHECK_COMPLETION → GENERATE_PRD
- [x] Implement smart defaults: persona inference, tech stack suggestion, auto-generated anti-requirements, KPI suggestions
- [x] Implement skip button per question + 10-question hard cap
- [x] Mobile layout: checklist collapses to top progress bar (< 768px viewport)

### Phase 4: NLSpec PRD Generation
**Dependencies:** Phase 1, Phase 2, Phase 3
- [ ] Implement PRD generation from completed checklist data (all 11 template sections)
- [ ] Auto-generate Implementation Phases section from feature dependency analysis
- [ ] Auto-generate Validation Harness (3-5 end-to-end scenarios from user stories)
- [ ] Auto-generate Anti-Requirements for skipped/missing input
- [ ] Mark skipped sections with `[SKIPPED — not specified by user]`
- [ ] Render PRD in preview pane within 30 seconds

### Phase 5: Quality Scorer (Checklist + Scenario-Based)
**Dependencies:** Phase 4
- [ ] Implement rubric-based checklist scorer (clarity 30%, completeness 25%, testability 25%, agent-readiness 20%)
- [ ] Implement vague term detection scanner with specific replacement suggestions
- [ ] Implement LLM-as-judge scenario validation (3 holdout scenarios, PASS/PARTIAL/FAIL)
- [ ] Implement combined quality gate: green (≥8 + scenarios pass), yellow (≥6 OR scenarios pass), red (< 6 AND scenarios fail)
- [ ] Display per-dimension breakdown + specific fix suggestions with auto-fix where possible

### Phase 6: Export Pipeline
**Dependencies:** Phase 4, Phase 5
- [ ] Implement Generic Markdown export (all 11 sections, clean formatting)
- [ ] Implement Cursor-optimized export (Agent Instructions preamble, `.cursorrules` appendix)
- [ ] Implement Claude Code-optimized export (CLAUDE.md preamble, anti-requirement emphasis)
- [ ] Implement PDF export (client-side via html2pdf.js or react-pdf)
- [ ] Implement copy-to-clipboard functionality
- [ ] Log export events to session history

### Phase 7: Iterative Refinement + Version Diffing
**Dependencies:** Phase 3, Phase 4, Phase 5
- [ ] Enable post-generation chat edits targeting specific PRD sections
- [ ] Implement section-level regeneration (not full PRD) for edits
- [ ] Implement diff view (green = added, red = removed) using diff library
- [ ] Implement version history (max 10 versions per session, timestamps, viewable)
- [ ] Auto re-run quality score after each edit

### Cross-Cutting (ongoing throughout all phases)
- [ ] Mobile responsiveness — all UI functional on viewports ≥ 375px
- [ ] Accessibility — WCAG 2.1 AA for core flows
- [ ] Client-side event logging for success metrics tracking

## Decisions

> Record architectural and design decisions here. Keep them out of rule files.

| Decision | Rationale | Date |
|----------|-----------|------|
| Next.js 15 App Router as full-stack framework | PRD specifies Next.js; App Router is the modern standard with RSC support | 2026-02-19 |
| Anthropic Claude SDK as primary AI backend | PRD specifies Claude as preferred LLM; structured output reliability | 2026-02-19 |
| No database for MVP — localStorage only | PRD v2.0 mandates browser-only persistence; no server-side storage | 2026-02-19 |
| Vitest for unit testing | Fast, TypeScript-native, compatible with Next.js ecosystem | 2026-02-19 |
| Tailwind CSS for styling | Rapid UI development, mobile-responsive utilities built-in | 2026-02-19 |
| Vercel for hosting | PRD specifies Vercel; native Next.js support, zero-config deploys | 2026-02-19 |
| PRD v2.0 adopted (NLSpec paradigm) | Adds phased implementation, anti-requirements, validation harness, scenario-based scoring | 2026-02-19 |
| Claude model: claude-sonnet-4-5-20250514 | PRD v2.0 §6 specifies this model for generation and scoring | 2026-02-19 |
| Rate limiting: client-side localStorage counter | PRD v2.0 §6 specifies client-side enforcement for MVP (honor system) | 2026-02-19 |
| Quality scoring: hybrid rubric + LLM-as-judge | PRD v2.0 §Phase 5 defines weighted rubric (clarity/completeness/testability/agent-readiness) + scenario validation | 2026-02-19 |
| PDF export: client-side (html2pdf.js or react-pdf) | PRD v2.0 §6 mandates client-side generation, no server round-trip | 2026-02-19 |
| Cursor/Claude Code toggle: in MVP | PRD v2.0 §Phase 6 defines agent-specific export as Phase 6 (MVP scope) | 2026-02-19 |
| Session = conversation, rate limit = generation+score cycles | PRD v2.0 §6: "5 PRD generation+score cycles per 24 hours" | 2026-02-19 |
| State management: React Context + useReducer | PRD v2.0 §6 mandates this; no Redux/Zustand for MVP | 2026-02-19 |

## Open Questions

> Questions that need clarification before or during implementation.

- [x] ~~Which Claude model to default to?~~ → **Resolved:** `claude-sonnet-4-5-20250514` per PRD v2.0 §6
- [x] ~~How should rate limiting be implemented?~~ → **Resolved:** Client-side localStorage counter + timestamp per PRD v2.0 §6
- [x] ~~Should conversation history be stored?~~ → **Resolved:** localStorage with auto-save, session recovery on reload per PRD v2.0 Phase 1
- [x] ~~What is the exact quality scoring algorithm?~~ → **Resolved:** Hybrid — weighted rubric (clarity 30%, completeness 25%, testability 25%, agent-readiness 20%) + LLM-as-judge scenario validation per PRD v2.0 Phase 5
- [x] ~~PDF export implementation?~~ → **Resolved:** Client-side via html2pdf.js or react-pdf per PRD v2.0 §6
- [x] ~~Should Cursor/Claude Code toggle be in MVP?~~ → **Resolved:** Yes, Phase 6 defines agent-specific exports per PRD v2.0
- [x] ~~What constitutes a "session" for rate limit?~~ → **Resolved:** Each "PRD generation+score cycle" counts as 1 of 5 per 24h per PRD v2.0 §6
- [x] ~~GDPR compliance?~~ → **Resolved:** Zero server-side storage of user prompts or PRDs in MVP; localStorage only per PRD v2.0 §6

## Completed

> Move completed milestones here for reference.

<!-- Nothing yet -->
