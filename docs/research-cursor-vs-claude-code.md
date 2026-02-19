# Research: Cursor (.cursorrules) vs Claude Code (CLAUDE.md) Format Differences

**Date:** 2026-02-19
**Purpose:** Identify concrete format differences between Cursor and Claude Code context systems to inform PRD generation that targets both tools.

---

## Table of Contents

1. [Background](#background)
2. [How Cursor Reads Rules](#how-cursor-reads-rules)
3. [How Claude Code Reads CLAUDE.md](#how-claude-code-reads-claudemd)
4. [Concrete Format Differences](#concrete-format-differences)
   - [Difference 1: Rule Scoping Mechanism](#difference-1-rule-scoping-mechanism)
   - [Difference 2: File Reference / Import Syntax](#difference-2-file-reference--import-syntax)
   - [Difference 3: Rule Activation Model](#difference-3-rule-activation-model)
   - [Difference 4: Document Structure and Hierarchy](#difference-4-document-structure-and-hierarchy)
   - [Difference 5: Emphasis and Priority Signaling](#difference-5-emphasis-and-priority-signaling)
5. [What Makes a PRD Effective for Each Tool](#what-makes-a-prd-effective-for-each-tool)
6. [Implications for PRD Generation](#implications-for-prd-generation)
7. [Sources](#sources)

---

## Background

Both Cursor and Claude Code consume Markdown-based configuration files to understand project context, coding conventions, and behavioral constraints. However, their file formats, loading mechanisms, and activation models differ significantly. Understanding these differences is critical for generating PRDs and specifications that work well with both tools.

### Cursor Context System

- **Legacy:** Single `.cursorrules` file in project root (deprecated but still functional).
- **Modern (2025+):** `.cursor/rules/` directory containing `.mdc` files (Markdown with YAML frontmatter).
- **User-level:** Global rules defined in Cursor Settings > Rules.

### Claude Code Context System

- **Primary:** `CLAUDE.md` file in project root (plain Markdown).
- **Modular:** `.claude/rules/` directory containing `.md` files with optional YAML frontmatter.
- **User-level:** `~/.claude/CLAUDE.md` and `~/.claude/rules/` for global preferences.
- **Nested:** Subdirectory `CLAUDE.md` files for monorepo/module-specific context.

---

## How Cursor Reads Rules

### File Format

Cursor's modern rules use the `.mdc` extension (Markdown Components) with YAML frontmatter:

```markdown
---
description: React component patterns for the frontend
globs:
  - "src/components/**/*.tsx"
  - "src/hooks/**/*.ts"
alwaysApply: false
---

# React Component Guidelines

- Use functional components exclusively
- Implement proper TypeScript prop interfaces
- Extract reusable logic into custom hooks
```

### Loading Behavior

1. **Always rules** (`alwaysApply: true`): Loaded into every conversation regardless of context.
2. **Auto-Attached rules** (`globs` defined, `alwaysApply: false`): Loaded only when the active file matches a glob pattern.
3. **Agent-Requested rules** (`description` present, no `globs`, `alwaysApply: false`): The AI agent reads the `description` field and decides whether to include the rule based on the current task.
4. **Manual rules** (no `description`, no `globs`, `alwaysApply: false`): Only included when explicitly referenced via `@ruleName` in chat.

### Key Characteristics

- Rules are loaded **per-interaction** and consume tokens from the model's context window.
- The `description` field is critical for Agent-Requested rules -- a vague description means the rule gets silently ignored.
- Glob patterns do NOT support brace expansion (`{ts,tsx}`) in all cases; comma-separated patterns are safer.
- Each rule file should be focused and small to minimize the "token tax."
- Rules can reference files using `@filename.ts` syntax to pull in example code as context.

---

## How Claude Code Reads CLAUDE.md

### File Format

Claude Code uses plain Markdown files (`.md` extension) with optional YAML frontmatter for path scoping:

```markdown
# Project Configuration

## Tech Stack
- Next.js 15 (App Router)
- TypeScript (strict mode)
- React 19

## Commands
- **Build**: `npm run build`
- **Test**: `npx vitest run`
- **Lint**: `npx next lint`
```

For path-scoped rules in `.claude/rules/`:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All API endpoints must include input validation
- Use the standard error response format
- Include OpenAPI documentation comments
```

### Loading Behavior

1. **Root `CLAUDE.md`**: Loaded at the start of every session as part of the system prompt. Receives high priority.
2. **`.claude/rules/*.md`**: All files loaded automatically with the same priority as `CLAUDE.md`. Files with `paths:` frontmatter are conditionally activated.
3. **Nested `CLAUDE.md`**: Subdirectory-level files loaded when Claude works on files in that directory.
4. **`CLAUDE.local.md`**: Per-user overrides, auto-added to `.gitignore`.
5. **File imports**: `@path/to/file.md` syntax pulls in external files, resolved recursively up to 5 levels deep.

### Key Characteristics

- The entire `CLAUDE.md` is injected into the system prompt at session start.
- Content is treated as authoritative -- Claude treats these instructions with high priority.
- No equivalent to Cursor's "Agent Requested" mode; rules are either always-on or path-matched.
- Supports the `@path/to/file` import syntax for modular composition.
- Recommended to keep under 500 lines for context efficiency.
- Brace expansion in glob patterns (`{ts,tsx}`) is supported in `paths:` frontmatter.

---

## Concrete Format Differences

### Difference 1: Rule Scoping Mechanism

**What differs:** Cursor uses `globs:` in YAML frontmatter; Claude Code uses `paths:` in YAML frontmatter. The keyword is different, and the activation semantics differ.

**Cursor way:**
```yaml
---
description: TypeScript API patterns
globs:
  - "src/api/**/*.ts"
  - "src/services/**/*.ts"
alwaysApply: false
---
# API patterns...
```

**Claude Code way:**
```yaml
---
paths:
  - "src/api/**/*.ts"
  - "src/services/**/*.ts"
---
# API patterns...
```

**Key distinctions:**
| Aspect | Cursor | Claude Code |
|--------|--------|-------------|
| Frontmatter keyword | `globs:` | `paths:` |
| Always-on flag | `alwaysApply: true` | Omit `paths:` entirely (rule loads unconditionally) |
| Description field | `description:` (used for agent-requested activation) | Not used / not supported |
| File extension | `.mdc` | `.md` |
| Brace expansion | Unreliable; use comma-separated patterns | Supported (`{ts,tsx}`) |

**Why this matters for PRD generation:** A PRD generator that outputs tool-specific configuration files must use the correct frontmatter keyword (`globs` vs `paths`) and file extension (`.mdc` vs `.md`). If generating rules for both tools from a single PRD, the generator needs a mapping layer. Additionally, Cursor's `description` field has no Claude Code equivalent, so any "when should this rule apply?" metadata must be expressed differently for each tool.

---

### Difference 2: File Reference / Import Syntax

**What differs:** Both tools support referencing external files, but the syntax and resolution behavior differ.

**Cursor way (inside `.mdc` files):**
```markdown
---
description: RPC Service boilerplate
globs:
  - "src/services/**/*.ts"
alwaysApply: false
---

- Use our internal RPC pattern when defining services
- Always use snake_case for service names

@service-template.ts
@../tsconfig.json
```
File references in Cursor are resolved relative to the rule file's location. They pull the referenced file into the rule's context when the rule is activated.

**Claude Code way (inside `CLAUDE.md` or `.claude/rules/*.md`):**
```markdown
# Project Configuration

See @README.md for project overview
See @docs/api-patterns.md for API conventions
See @package.json for available npm scripts

## Additional Standards
@.claude/rules/security.md
@~/.claude/shared-preferences.md
```
File references in Claude Code use the same `@path` syntax but support:
- Relative paths (resolved from the file containing the import)
- Home directory paths (`@~/.claude/...`)
- Recursive resolution up to 5 levels deep (imported files can import other files)

**Key distinctions:**
| Aspect | Cursor | Claude Code |
|--------|--------|-------------|
| Syntax | `@filename` at end of rule body | `@path/to/file` inline in any Markdown text |
| Home directory | Not supported | Supported (`@~/.claude/...`) |
| Recursive imports | Not documented | Up to 5 levels deep |
| When resolved | When rule activates | At session start |
| Inline prose | Typically standalone lines | Can appear mid-sentence |

**Why this matters for PRD generation:** If a generated PRD references supporting documents (API specs, data models, architecture diagrams), the reference syntax must match the target tool. A PRD generator should output `@` references that are valid for the target platform. For Cursor, file references are typically appended at the end of a rule block. For Claude Code, they can be woven into prose naturally. A PRD that says "See @docs/data-model.md for entity definitions" works in Claude Code but would need restructuring for Cursor's rule format.

---

### Difference 3: Rule Activation Model

**What differs:** Cursor has four distinct activation modes; Claude Code has two. This fundamentally changes how rules should be organized.

**Cursor's four-mode system:**

| Mode | Trigger | Frontmatter |
|------|---------|-------------|
| **Always** | Every conversation | `alwaysApply: true` |
| **Auto Attached** | File matches glob | `globs:` defined, `alwaysApply: false` |
| **Agent Requested** | AI decides based on description | `description:` present, no `globs` |
| **Manual** | User types `@ruleName` | No frontmatter fields set |

Example of an Agent-Requested rule (no Claude Code equivalent):
```yaml
---
description: Database migration patterns. Apply when creating or modifying
  database migrations, schema changes, or seed files.
---

# Database Migration Rules

- Always create both up and down migrations
- Use timestamps for migration filenames
- Never modify an existing migration that has been deployed
```
The AI reads the `description` and decides at runtime whether this rule is relevant to the current task. This is a form of semantic matching that does not exist in Claude Code.

**Claude Code's two-mode system:**

| Mode | Trigger | Frontmatter |
|------|---------|-------------|
| **Always** | Every session | No `paths:` frontmatter (or root `CLAUDE.md`) |
| **Path-matched** | Working on matching files | `paths:` defined |

Claude Code has no equivalent to "Agent Requested." Rules either load unconditionally or match on file paths. There is no semantic/intent-based activation.

**Why this matters for PRD generation:** When generating specifications:
- For **Cursor**, you can create semantically-triggered rules with descriptive `description:` fields -- the AI will self-select relevant rules. This allows more granular, topic-based rule files without worrying about glob patterns.
- For **Claude Code**, every rule must either always load or be tied to specific file paths. Topic-based rules (like "database migration patterns") that do not map cleanly to file paths must be placed in always-on files, consuming context budget on every interaction.

A PRD generator must account for this: rules that are "sometimes relevant" need different packaging strategies for each tool.

---

### Difference 4: Document Structure and Hierarchy

**What differs:** Claude Code uses a single hierarchical Markdown document with nested headings as its primary format. Cursor expects atomic, single-topic rule files with metadata in frontmatter.

**Cursor way -- atomic rule files:**

File: `.cursor/rules/code-style.mdc`
```yaml
---
description: TypeScript code style conventions
globs:
  - "**/*.ts"
  - "**/*.tsx"
alwaysApply: false
---

# TypeScript Code Style

- Use `interface` for object shapes, `type` for unions
- Prefer `const` assertions for literal values
- Never use `any`; use `unknown` with type guards
```

File: `.cursor/rules/testing.mdc`
```yaml
---
description: Testing conventions for unit and integration tests
globs:
  - "**/*.test.ts"
  - "**/*.spec.ts"
alwaysApply: false
---

# Testing Conventions

- Use Vitest for all tests
- Mock external dependencies
- Each test file mirrors the source file it tests
```

Each file is independently activated. The AI only sees the rules relevant to the current task, reducing token consumption.

**Claude Code way -- hierarchical document:**

File: `CLAUDE.md`
```markdown
# Project Configuration

## Tech Stack
- Next.js 15, TypeScript (strict), React 19

## Commands
- **Build**: `npm run build`
- **Test**: `npx vitest run`

## Code Style
- Use `interface` for object shapes, `type` for unions
- Never use `any`; use `unknown` with type guards

## Testing
- Use Vitest for all tests
- Mock external dependencies

## Architecture
- Server Components by default; `"use client"` only when needed
- API routes in `app/api/` as `route.ts` files
```

Claude Code loads the entire document as system-prompt context. While modular `.claude/rules/` files exist, the primary pattern is a single rich document with sections delineated by Markdown headings.

**Key distinctions:**
| Aspect | Cursor | Claude Code |
|--------|--------|-------------|
| Primary unit | Individual `.mdc` file (one topic) | Single `CLAUDE.md` (multi-topic) with sections |
| Organization | Many small files in `.cursor/rules/` | One large file + optional `.claude/rules/` files |
| Context loading | Selective (only matching rules) | Wholesale (entire document at session start) |
| Heading hierarchy | Flat within each file | Deep (`##`, `###`, `####`) across one document |
| Cross-referencing | Rules are independent | Sections reference each other implicitly |

**Why this matters for PRD generation:** A PRD generator must produce different output structures:
- For **Cursor**: Break the specification into multiple focused files, each with its own frontmatter. Topics that cross-reference each other must either duplicate information or use `@file` references.
- For **Claude Code**: Produce a single, well-structured document with clear heading hierarchy. The entire spec loads every session, so conciseness matters (recommended under 500 lines). Cross-references are natural since everything is in one document.

---

### Difference 5: Emphasis and Priority Signaling

**What differs:** The mechanisms for telling the AI "this rule is critical" differ between the two tools.

**Cursor way -- frontmatter-based priority:**
```yaml
---
description: CRITICAL security rules that must never be violated
globs:
  - "**/*"
alwaysApply: true
---

# Security Rules (CRITICAL)

- NEVER expose API keys in client-side code
- NEVER disable CORS in production
- ALWAYS validate and sanitize user input
```
In Cursor, the strongest priority signal is `alwaysApply: true` combined with broad globs. The `description` field can include urgency language ("CRITICAL") to influence Agent-Requested activation. Beyond that, Cursor relies on standard Markdown emphasis and the ALL-CAPS convention (`NEVER`, `ALWAYS`).

**Claude Code way -- position and emphasis in Markdown:**
```markdown
# Project Configuration

> **IMPORTANT**: These instructions OVERRIDE any default behavior.

## Critical Rules

- **NEVER** expose API keys in client-side code
- **NEVER** disable CORS in production
- **MUST** validate and sanitize all user input

## Code Style

- Prefer `interface` for object shapes
- Use Tailwind CSS utility classes
```
Claude Code documentation notes that:
- Position matters: instructions earlier in the document get more attention.
- **Bold** and UPPERCASE emphasis words (`NEVER`, `MUST`, `IMPORTANT`) help but should be used sparingly -- "if everything is marked IMPORTANT, nothing is."
- Blockquotes (`>`) can signal meta-instructions.
- There is no frontmatter-based priority mechanism; it is purely Markdown formatting and document position.

**Key distinctions:**
| Aspect | Cursor | Claude Code |
|--------|--------|-------------|
| Structural priority | `alwaysApply: true` guarantees loading | Position in document (earlier = higher priority) |
| Emphasis mechanism | `description` urgency + Markdown | Markdown bold/caps + blockquotes |
| Granularity | Per-file priority (always vs conditional) | Per-section within one document |
| Risk of dilution | Low (only always-on rules consume tokens) | High (entire doc loads; overuse of emphasis reduces signal) |

**Why this matters for PRD generation:** When generating specs with critical constraints:
- For **Cursor**: Create a dedicated always-on rule file for critical constraints. Less important rules go in conditional files.
- For **Claude Code**: Place critical constraints at the top of `CLAUDE.md`. Use **bold**, UPPERCASE, and blockquote formatting sparingly for maximum signal. Less critical information goes in lower sections or separate `.claude/rules/` files.

---

## What Makes a PRD Effective for Each Tool

### For Cursor

1. **Modular, topic-scoped files.** Break the PRD into multiple `.mdc` rule files, each covering one topic (auth, API patterns, testing, deployment). This leverages Cursor's selective loading to keep token usage low.

2. **Rich `description` fields.** Write clear, specific descriptions so Agent-Requested rules activate reliably. Bad: "API stuff." Good: "REST API patterns for Express routes. Apply when creating or modifying API endpoints in src/api/."

3. **Concrete code examples.** Cursor performs best with "gold standard" reference files. Include `@path/to/example.ts` references pointing to ideal implementations.

4. **Explicit glob patterns.** Map rules to specific file types and directories. The more precise the glob, the less irrelevant context the AI sees.

5. **Phased task lists.** Cursor's agentic workflows benefit from PRDs broken into numbered tasks with clear acceptance criteria, often stored in a `tasks/` directory as individual files.

### For Claude Code

1. **Single well-structured document.** Organize the PRD as one Markdown file with clear heading hierarchy. Claude Code loads it wholesale, so a logical flow matters.

2. **Executable commands up front.** Place build, test, and lint commands near the top. Claude Code references these constantly.

3. **Separation of concerns across file types.** Use `PRD.md` for requirements, `CLAUDE.md` for behavioral constraints, and `ROADMAP.md` for status. Claude Code's memory system expects this separation.

4. **Explicit non-goals and constraints.** Claude Code follows instructions with high fidelity, but cannot infer boundaries from omission. State what NOT to do.

5. **File references with `@` syntax.** Use `@docs/api-spec.md` to keep the root document lean while providing access to detailed supporting documents.

6. **Under 500 lines.** The root `CLAUDE.md` should stay concise. Move detailed domain rules into `.claude/rules/` files.

---

## Implications for PRD Generation

When building a PRD generator that targets both tools, consider these strategies:

### 1. Generate a Canonical PRD, Then Transform

Maintain a single source-of-truth PRD in standard Markdown. Generate tool-specific configurations from it:
- **For Cursor:** Split into `.mdc` files with appropriate frontmatter (`description`, `globs`, `alwaysApply`).
- **For Claude Code:** Generate a structured `CLAUDE.md` with heading hierarchy, plus `.claude/rules/` files with `paths:` frontmatter for domain-specific rules.

### 2. Map Rule Categories to Activation Strategies

| Rule Category | Cursor Strategy | Claude Code Strategy |
|---------------|----------------|---------------------|
| Universal coding standards | `alwaysApply: true` | Top of `CLAUDE.md` |
| File-type-specific patterns | `globs:` matching file extensions | `paths:` in `.claude/rules/` |
| Topic-specific guidelines | `description:` for agent-requested | Always-on in `.claude/rules/` (no path scoping) |
| Critical constraints | Dedicated always-on `.mdc` file | Bold/caps at top of `CLAUDE.md` |
| Reference examples | `@file` references in rule body | `@file` imports in `CLAUDE.md` |

### 3. Account for Token Budget Differences

- Cursor's modular system means you can be verbose in individual rule files -- only relevant ones load.
- Claude Code loads everything at session start, so total volume matters. Aim for conciseness in the root document and use `@` imports for detail.

### 4. Handle Non-Goals Differently

- **Cursor:** Non-goals can go in an always-on rule or in the PRD file referenced by the project.
- **Claude Code:** Non-goals should be in `CLAUDE.md` with emphasis formatting, or in `.claude/rules/` as behavioral constraints ("what NOT to do").

---

## Sources

### Cursor Documentation and Guides
- [Awesome Cursorrules - GitHub](https://github.com/PatrickJS/awesome-cursorrules)
- [Comprehensive Guide to .cursorrules](https://cursorrules.org/blog/comprehensive-guide-cursorrules-optimized-ai-programming)
- [Cursor IDE Rules for AI](https://kirill-markin.com/articles/cursor-ide-rules-for-ai/)
- [Cursor Rules Best Practices - Tautorn](https://www.tautorn.com.br/blog/cursor-rules)
- [Cursor AI Complete Guide 2025 - Medium](https://medium.com/@hilalkara.dev/cursor-ai-complete-guide-2025-real-experiences-pro-tips-mcps-rules-context-engineering-6de1a776a8af)
- [What are Cursor Rules? - WorkOS](https://workos.com/blog/what-are-cursor-rules)
- [Cursor IDE Rules Deep Dive - Mervin Praison](https://mer.vin/2025/12/cursor-ide-rules-deep-dive/)
- [Lambda Curry Cursor Rules Best Practices](https://www.lambdacurry.dev/blog/comprehensive-cursor-rules-best-practices-guide)
- [Cursor Rules Guide - design.dev](https://design.dev/guides/cursor-rules/)
- [How to Write Great Cursor Rules - Trigger.dev](https://trigger.dev/blog/cursor-rules)
- [Guide to Cursor Rules Token Tax - Medium](https://medium.com/@peakvance/guide-to-cursor-rules-engineering-context-speed-and-the-token-tax-16c0560a686a)
- [Cursor Rules in Action at Atlan](https://blog.atlan.com/engineering/cursor-rules/)
- [PRDs for Cursor - ChatPRD](https://www.chatprd.ai/resources/PRD-for-Cursor)
- [Write a PRD for Cursor - CursorForPMs](https://www.cursorforpms.com/advanced/write-prd)

### Claude Code Documentation and Guides
- [Using CLAUDE.MD files - Anthropic Blog](https://claude.com/blog/using-claude-md-files)
- [Writing a Good CLAUDE.md - HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [How to Write a Good CLAUDE.md - Builder.io](https://www.builder.io/blog/claude-md-guide)
- [Claude Code Rules Directory - claudefa.st](https://claudefa.st/blog/guide/mechanics/rules-directory)
- [Claude Code Gets Path-Specific Rules - paddo.dev](https://paddo.dev/blog/claude-rules-path-specific-native/)
- [Modular Rules in Claude Code - claude-blog.setec.rs](https://claude-blog.setec.rs/blog/claude-code-rules-directory)
- [Manage Claude's Memory - Claude Code Docs](https://code.claude.com/docs/en/memory)
- [Claude Code Best Practices - Anthropic](https://www.anthropic.com/engineering/claude-code-best-practices)
- [CLAUDE.md for .NET Developers - codewithmukesh](https://codewithmukesh.com/blog/claude-md-mastery-dotnet/)
- [Claude Skills and CLAUDE.md Guide 2026 - gend.co](https://www.gend.co/blog/claude-skills-claude-md-guide)
- [Reference Files with @ in Claude Code - MCPcat](https://mcpcat.io/guides/reference-other-files/)
- [PRDs for Claude Code - ChatPRD](https://www.chatprd.ai/resources/PRD-for-Claude-Code)
- [Claude Code for Product Managers - Builder.io](https://www.builder.io/blog/claude-code-for-product-managers)

### Comparative and General
- [Cursor vs Claude Code - Tembo](https://www.tembo.io/blog/cursor-vs-claude-code)
- [Claude Code vs Cursor 2026 - Builder.io](https://www.builder.io/blog/cursor-vs-claude-code)
- [Claude Code vs Cursor - Qodo](https://www.qodo.ai/blog/claude-code-vs-cursor/)
- [How to Write PRDs for AI Coding Agents - Medium](https://medium.com/@haberlah/how-to-write-prds-for-ai-coding-agents-d60d72efb797)
- [How to Write a Good Spec for AI Agents - Addy Osmani](https://addyosmani.com/blog/good-spec/)
- [AGENTS.md: One File to Guide Them All - Layer5](https://layer5.io/blog/ai/agentsmd-one-file-to-guide-them-all/)
- [AGENTS.md - Upsun Developer Center](https://devcenter.upsun.com/posts/why-your-readme-matters-more-than-ai-configuration-files/)
- [Cursor Rules to Claude Converter - GitHub](https://github.com/StackOneHQ/cursor-rules-to-claude)
