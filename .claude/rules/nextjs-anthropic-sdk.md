---
description: Constraints for using Next.js App Router and the Anthropic TypeScript SDK correctly
globs: "**/*.{ts,tsx}"
---

# Next.js + Anthropic SDK Constraints

## Anthropic SDK (`@anthropic-ai/sdk` v0.68.x)

### Client Instantiation
- The default export is the `Anthropic` class: `import Anthropic from '@anthropic-ai/sdk'`
- The client reads `ANTHROPIC_API_KEY` from `process.env` by default — do NOT pass it explicitly unless using a non-default env var name.
- Never instantiate the client in a Client Component or any file with `"use client"` — the API key must stay server-side.
- Do NOT set `dangerouslyAllowBrowser: true` — all API calls must go through server-side routes.

### Messages API
- The method is `client.messages.create()` — NOT `client.chat()`, NOT `client.complete()`, NOT `client.completions.create()`. These do not exist.
- Required parameters: `model`, `max_tokens`, `messages`. Omitting `max_tokens` will throw.
- The `model` parameter accepts strings like `'claude-sonnet-4-5-20250929'` or `'claude-3-5-haiku-20241022'`. Do NOT use bare names like `'claude-3'` or `'sonnet'`.
- The `system` parameter is a top-level parameter on the request, NOT a message with `role: 'system'`. There is no `system` role in the messages array.
- Response content is `message.content` which is an array of content blocks, NOT a string. Access text via `message.content[0].text`.

### Streaming
- Two approaches exist:
  1. `client.messages.create({ ..., stream: true })` — returns raw SSE async iterable of `MessageStreamEvent`
  2. `client.messages.stream({ ... })` — returns a `MessageStream` helper with `.on('text', cb)` events and `.finalMessage()`
- Do NOT mix these — `.stream()` does NOT accept a `stream: true` parameter.
- For Next.js API routes returning streamed responses to the client, use approach 1 with a `ReadableStream` or approach 2 with event forwarding.

### Error Handling
- All API errors extend `Anthropic.APIError` with `.status`, `.name`, `.headers` properties.
- Rate limiting returns status 429 as `Anthropic.RateLimitError` — implement exponential backoff or queue.
- The SDK auto-retries failed requests 2 times by default. Configure via `new Anthropic({ maxRetries: N })`.

### What Does NOT Exist (common hallucinations)
- No `client.chat()` method
- No `client.completions` namespace
- No `role: 'system'` in messages array (use the top-level `system` parameter)
- No `client.models.list()` method
- No `Anthropic.Models` enum — model names are strings
- No `client.messages.count_tokens()` — token counting is via `message.usage` in the response

## Next.js App Router (v15.x)

### Server vs Client Boundaries
- Files in `app/` are Server Components by default. Do NOT add `"use client"` unless the component uses hooks, browser APIs, or event handlers.
- Server Components can `await` directly in the component body. Client Components cannot.
- You cannot import a Server Component into a Client Component. Pass server data as props via a Server Component parent instead.
- `"use server"` marks Server Actions (functions), NOT Server Components. Do not confuse the two directives.

### Dynamic Routes
- In Next.js 15, `params` is a `Promise`. Always use `async function Page({ params }: { params: Promise<{ slug: string }> })` and `await params`.
- Same applies to `searchParams` in page components — it is also a `Promise`.

### API Routes
- API routes are `app/api/[...]/route.ts` files exporting named HTTP method handlers: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.
- Use `NextRequest` and `NextResponse` from `'next/server'`.
- For streaming responses, return `new Response(readableStream, { headers: { 'Content-Type': 'text/event-stream' } })`.

### Caching
- Next.js 15 changed caching defaults — `fetch()` in Server Components is NOT cached by default (unlike Next.js 14).
- Use `revalidate` or `cache: 'force-cache'` explicitly when caching is desired.

## Documentation Links
- Anthropic SDK: https://github.com/anthropics/anthropic-sdk-typescript
- Anthropic API docs: https://docs.anthropic.com/en/api/messages
- Next.js App Router: https://nextjs.org/docs/app
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
