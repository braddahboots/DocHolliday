# Project Roadmap

> **Owner of**: Project status, milestones, decisions, and open questions.
> **Read by**: Agents, `/status`, `/plan`, `/plan-feature`
> **Updated by**: `/milestone` skill (the only skill that writes here).

## Current Milestone

**Milestone**: MVP — Core PRD Generation Flow
**Goal**: User inputs a rough idea, receives guided AI questions, and exports a structured, scored Markdown PRD.
**Status**: Not started

### Tasks
<!-- Sequenced by dependency order. Foundation first, then features. -->

- [ ] Project scaffolding — Initialize Next.js 15 App Router with TypeScript, Tailwind CSS, ESLint, Vitest
- [ ] Core types — Define TypeScript types for Session, Message, PRD, QualityScore, ChecklistItem in `lib/types/`
- [ ] Anthropic SDK integration — Create server-side API route (`app/api/chat/route.ts`) that wraps `client.messages.create()` with streaming
- [ ] System prompt engineering — Design the system prompt that guides Claude to ask targeted PRD questions and track checklist completeness
- [ ] Chat UI — Build conversational interface (message list, input box, send button, loading states) as Client Component
- [ ] Guided interview flow — Implement gap detection, follow-up questions, skip option, and progress tracking
- [ ] PRD template generation — Auto-generate structured PRD from conversation (all 8 sections from PRD spec)
- [ ] Quality scorer — Implement 0-10 scoring with per-category breakdowns (clarity, completeness, testability, AI-readiness)
- [ ] Iterative refinement — Allow post-generation chat edits with live PRD updates and version diffs
- [ ] One-click export — Markdown export (copy-to-clipboard + file download), PDF fallback
- [ ] Mobile responsiveness — Ensure chat UI and export work on mobile viewports
- [ ] Smoke test + validation pipeline — Wire up `npm run validate` with type-check, lint, unit tests, smoke test

## Decisions

> Record architectural and design decisions here. Keep them out of rule files.

| Decision | Rationale | Date |
|----------|-----------|------|
| Next.js 15 App Router as full-stack framework | PRD specifies Next.js; App Router is the modern standard with RSC support | 2026-02-19 |
| Anthropic Claude SDK as primary AI backend | PRD specifies Claude as preferred LLM; structured output reliability | 2026-02-19 |
| No database for MVP | Conversation state in client-side React state; simplifies MVP scope | 2026-02-19 |
| Vitest for unit testing | Fast, TypeScript-native, compatible with Next.js ecosystem | 2026-02-19 |
| Tailwind CSS for styling | Rapid UI development, mobile-responsive utilities built-in | 2026-02-19 |
| Vercel for hosting | PRD specifies Vercel; native Next.js support, zero-config deploys | 2026-02-19 |

## Open Questions

> Questions that need clarification before or during implementation. Extracted from PRD during bootstrap.

- [ ] Which Claude model to default to? (`claude-sonnet-4-5-20250929` for speed/cost, or `claude-3-5-haiku-20241022` for budget, or allow user selection?)
- [ ] How should rate limiting be implemented for the free tier (5 PRDs/day)? Client-side counter vs server-side with IP tracking vs auth-based?
- [ ] Should conversation history be stored anywhere (localStorage, server) or is ephemeral-only acceptable for MVP?
- [ ] What is the exact quality scoring algorithm? Weighted checklist vs Claude self-evaluation vs hybrid?
- [ ] PDF export implementation: client-side (html2pdf.js, jsPDF) vs server-side (Puppeteer, wkhtmltopdf)?
- [ ] Should the "Optimized for Cursor" vs "Optimized for Claude Code" toggle be in MVP or post-MVP?
- [ ] What constitutes a "session" for the 5 PRDs/day rate limit — a new conversation, or each export action?
- [ ] GDPR compliance: "No long-term prompt storage" + "anon usage option" — does this mean no server-side logging at all, or just no PII retention?

## Completed

> Move completed milestones here for reference.

<!-- Nothing yet -->
