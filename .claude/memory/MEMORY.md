# Project Memory — Cross-Session Learnings

> First 200 lines are auto-loaded into every session.
> Structure: Gotchas → Lessons → Protocols
> When a lesson is confirmed across multiple sessions, promote it to a rule or hook.

---

## SDK/Framework Gotchas
> Add verified SDK-specific pitfalls here. Include version numbers.

- [@anthropic-ai/sdk v0.68.x] System prompt is a top-level `system` parameter on the request, NOT a message with `role: 'system'`. The messages array only accepts `'user'` and `'assistant'` roles.
- [@anthropic-ai/sdk v0.68.x] `message.content` is an array of content blocks, NOT a string. Access text via `message.content[0].text`.
- [@anthropic-ai/sdk v0.68.x] `client.messages.stream()` helper does NOT accept `stream: true` — that param is only for `client.messages.create()`.
- [@anthropic-ai/sdk v0.68.x] There is NO `client.chat()`, NO `client.completions`, NO `client.complete()`. Only `client.messages.create()` and `client.messages.stream()`.
- [@anthropic-ai/sdk v0.68.x] Never call from client-side code — set `dangerouslyAllowBrowser: true` is a security risk. Route all calls through Next.js API routes.
- [Next.js 15] `params` and `searchParams` in page/layout components are Promises — must `await` them. Synchronous destructuring causes TypeScript errors.
- [Next.js 15] `redirect()` throws a special Next.js error internally — never use it inside `try/catch` blocks.
- [Next.js 15] Caching defaults changed from Next.js 14: `fetch()` in Server Components is NOT cached by default.
- [Next.js 15] `"use client"` marks Client Components. `"use server"` marks Server Actions (functions). These are NOT opposites — do not confuse them.

---

## Infrastructure Lessons

- Never trust AI self-verification — demand file path + line number evidence
- Memory alone doesn't change behavior — escalate to rules, then hooks
- Three-layer enforcement: memory (learning) → rules (instruction) → hooks (guarantee)
- Delete fabricated code, don't warn — leaving wrong code with comments doesn't work
- The compiler is the final arbiter — if it says something doesn't exist, it doesn't exist
- Separation of concerns for agents — reviewer reports, implementer fixes, devops commits

---

## Verification Protocols

- Before using any SDK API: truth file → docs → ask user (never guess)
- After every edit: hooks automatically check imports + run type-checker
- Before every commit: run /validate to catch issues early
- Evidence requirement: every API call must have traceable verification source

---

## Workflow Preferences
> How we work — agreed upon with the user

- **Use `/review` before committing** — Run the code-reviewer agent to get a second pair of eyes on changes before they're committed. Don't skip this step.
- **Use `/commit` for validated commits** — Let the devops agent handle staging, validation, and commit message formatting rather than doing git operations manually.
- **Use the implementer agent** for feature work when parallelization or context protection is beneficial (e.g., building two independent features, or offloading a large implementation to keep the main context clean).
- **Agent workflow**: implement → `/review` → fix issues → `/commit`

---

## Template Feedback Loop
> After each `/commit`, reflect: did this reveal a gap in the base template?
> If yes, append to `TEMPLATE_FEEDBACK.md`. This feeds improvements back to `braddahboots/claude-agentic-template`.

- **What qualifies**: Missing hooks, rules that should be universal, workflow friction, session-start gaps, missing utilities
- **What doesn't**: Project-specific bugs, one-off issues, SDK-specific gotchas (those go in SDK Gotchas above)
- **Location**: `TEMPLATE_FEEDBACK.md` at project root — **overwritten fresh each commit** (not appended to). Each post-mortem is a standalone document the user feeds to the template repo for review.

---

## Project-Specific Notes
> Added during development as patterns emerge

- DocHolliday is a Next.js App Router full-stack app. Frontend in `app/`, API routes in `app/api/`, shared types in `lib/types/`.
- All Anthropic SDK calls go through `app/api/` route handlers — never from client components.
- Truth file at `anthropic-sdk-truth.md` is a STUB until `npm install` is run — regenerate with `bash scripts/generate-truth-file.sh`.
- Model names are strings like `'claude-sonnet-4-5-20250929'` — there is no enum.

