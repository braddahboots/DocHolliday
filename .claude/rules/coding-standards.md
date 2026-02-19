---
description: Project coding standards (customize after bootstrap)
globs: "**/*"
---

# Coding Standards

> **Note:** This file should be customized by the `/bootstrap` skill based on your project's tech stack. The defaults below are universal principles.

## Universal Principles

1. **Type safety first** — Use the language's type system fully. Avoid escape hatches (`any` in TS, `Any` in Python, `interface{}` in Go).
2. **Explicit over implicit** — Prefer named parameters, explicit return types, and clear variable names.
3. **Error handling** — Every external call (API, DB, file I/O) must have error handling. Never silently swallow errors.
4. **No magic numbers** — Extract constants with descriptive names.
5. **Single responsibility** — Each function does one thing. Each file has one clear purpose.
6. **Prefer composition over inheritance** — Unless the SDK/framework mandates inheritance.

## TypeScript + Next.js Standards

### TypeScript
- Enable `strict: true` in `tsconfig.json` — never disable it.
- Never use `any`. Use `unknown` and narrow with type guards when the type is truly dynamic.
- Prefer `interface` for object shapes that may be extended; use `type` for unions, intersections, and mapped types.
- All API response types must be explicitly defined — never infer from `any`-typed JSON.
- Use `as const` for literal constants (model names, status strings).
- Prefer `satisfies` over `as` for type assertions when validating shape without widening.

### Next.js App Router
- Every component in `app/` is a Server Component by default. Only add `"use client"` when the component needs browser APIs, hooks, or event handlers.
- In Next.js 15, `params` in dynamic routes is a `Promise` — always `await` it in `async` functions. Never destructure it synchronously.
- Never call `redirect()` inside a `try/catch` block — it throws internally and will be caught.
- Use `loading.tsx` and `error.tsx` at meaningful route boundaries.
- API routes live in `app/api/` as `route.ts` files. Use `NextRequest`/`NextResponse` types.
- Prefer Server Actions for mutations; use Route Handlers (`route.ts`) for streaming responses and webhook endpoints.
- Always set explicit `export const runtime = 'nodejs'` or `'edge'` when the default is ambiguous.

### React
- No inline styles — use Tailwind CSS utility classes or CSS modules.
- Extract reusable UI into `components/` — page files should be thin orchestrators.
- Prefer controlled components for form inputs.

### Anthropic SDK
- Always handle `Anthropic.APIError` subclasses (especially `RateLimitError` with status 429).
- Never expose the API key to the client — all Anthropic calls must go through server-side API routes or Server Actions.
- Use `client.messages.stream()` helper for streaming (returns an async iterable with `.on('text', ...)` events) rather than `client.messages.create({ stream: true })` when you need event callbacks.
