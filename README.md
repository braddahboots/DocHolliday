# DocHolliday

Turn rough ideas into complete, high-quality, AI-coding-tool-ready Product Requirements Documents in minutes via guided conversation.

## What This Is

DocHolliday is a web application that guides users through a conversational interview to produce structured, scored, exportable Markdown PRDs optimized for AI coding tools (Cursor, Claude Code, etc.).

**Core flow:** User inputs a rough idea → AI detects gaps and asks targeted follow-ups → generates a structured PRD → scores it for quality (0-10) → exports clean Markdown.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes with Anthropic Claude SDK
- **Testing:** Vitest (unit), TypeScript (type-check), Next.js ESLint (lint)
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- [jq](https://jqlang.github.io/jq/) (required by hook scripts)

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Run dev server
npm run dev
```

### Validation

```bash
npm run validate
```

This runs the full pipeline: TypeScript type-check → ESLint → Vitest unit tests → smoke test.

## Project Structure

See [CODEBASE_OVERVIEW.md](./CODEBASE_OVERVIEW.md) for a complete file map.

## Development

This project uses Claude Code with a `.claude/` infrastructure for AI-assisted development. Key commands:

| Skill | Description |
|-------|-------------|
| `/plan` | Recommends the next task based on ROADMAP.md |
| `/plan-feature` | Breaks a feature into sequenced implementation steps |
| `/commit` | Validate and commit with conventional format |
| `/validate` | Full validation pipeline |
| `/milestone` | Update ROADMAP.md with progress |
| `/status` | Show current milestone and open questions |
| `/review` | Trigger code review on recent changes |

## License

Private — All rights reserved.
