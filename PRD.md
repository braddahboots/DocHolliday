# PRDGen AI – Product Requirements Document (NLSpec)

**Version:** 2.0
**Owner:** Boots (@BraddahBoots)
**Date:** February 19, 2026
**Status:** MVP Definition – Ready for Implementation
**Paradigm:** Spec-Driven Development (aligned with StrongDM Software Factory principles + GitHub Spec Kit)

---

## 1. Overview & Vision

**Product Name:** PRDGen AI
**Tagline:** Turn rough ideas into agent-executable NLSpecs — structured, scored, and validated — so AI coding tools build what you actually meant.

### Core Problem Solved

AI coding agents (Cursor, Claude Code, Codex, etc.) produce hallucinated, incomplete, or misaligned code when given vague specifications. The root cause is not the agent — it is the spec. Engineers and indie devs lack the PM expertise to write specs precise enough for non-interactive agent execution. This results in:

- 30-35% of dev time spent clarifying ambiguous requirements after code is written
- ~48% of AI-generated code containing bugs or hallucinated functionality traceable to spec gaps
- Blank-page paralysis that delays projects by days or weeks before a single line of code is written

The industry is converging on a principle: **the specification is the source of truth, and code is its expression.** GitHub's Spec Kit framework, StrongDM's Software Factory, and practitioners like Nate Jones all point to the same conclusion — knowing what to build is now the highest-value skill. PRDGen AI makes that skill accessible to anyone.

### Vision (North Star)

Enable any user to input a rough idea -> receive a guided interview that surfaces every critical gap -> produce a structured, validated NLSpec with scenarios, implementation phases, anti-requirements, and a validation harness -> export as agent-ready Markdown optimized for Cursor, Claude Code, or similar tools -> reduce ideation-to-working-prototype time by 80%.

### Success Definition

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| User satisfaction | NPS >= 9 | Post-export in-app survey (1-question NPS + optional comment) |
| Generation + refinement time | <= 3 minutes median | Timestamp delta: session start -> export click |
| PRD quality (scenario-based) | >=80% of exports pass validation | LLM-as-judge against 3 holdout scenarios per PRD type |
| PRD quality (checklist) | >=80% of exports score >=8/10 | Automated rubric evaluation at export time |
| 7-day retention | >=60% return within 7 days | Event tracking: unique user sessions with >=1 export per 7-day window |
| Agent execution success | >=70% of exported PRDs produce functional code on first agent pass | Post-MVP: opt-in telemetry |

---

## 2. Target Users & Personas

### Primary Persona: The Solo Builder

**Name:** Alex — Indie dev / solo founder
**Background:** Strong technical skills (can code), weak PM skills (never written a formal spec). Building side projects or first startup.
**Pain:** Jumps straight to coding -> hits ambiguity walls -> rewrites. Or pastes a half-baked idea into Cursor -> gets generic scaffolding that misses the point.
**Goal:** Go from "I have an idea for X" to "here's a spec I can paste into Claude Code and get a working prototype" in under 5 minutes.
**Anti-goal:** Does NOT want to spend 30 minutes answering questions. Will abandon if the interview feels like bureaucracy.

### Secondary Persona: The Juggling PM

**Name:** Sam — Early-stage startup PM managing 3+ product ideas simultaneously
**Background:** Has PM experience but lacks bandwidth. Needs to rapidly spec ideas for prioritization and team alignment.
**Pain:** Vague PRDs cause team misalignment. Each idea takes 2-4 hours to spec properly. Wants fast iteration with quality feedback.
**Goal:** Produce scored, comparable PRDs across multiple ideas to make prioritization decisions.
**Anti-goal:** Does NOT want the tool to make product decisions for them. Wants to stay in control of scope and prioritization.

### Explicit Non-Users (Out of Scope for MVP)

- Large enterprise teams needing approval workflows, RBAC, or audit trails
- Non-technical founders with no intent to use AI coding tools
- Users seeking full project management (Jira/Linear replacement)

---

## 3. Key Pain Points Addressed

1. **Blank-page paralysis** — Users don't know what sections a good spec needs. The guided interview eliminates this by inferring structure from natural-language input and filling gaps through targeted questions.
2. **Vague language -> agent hallucinations** — AI coding agents interpret specs literally. Phrases like "clean UI" or "fast performance" produce arbitrary implementations. PRDGen AI flags vague terms and forces specificity before export.
3. **Missing anti-requirements** — Users specify what the system SHOULD do but rarely what it MUST NOT do. AI agents fill unstated constraints with default behavior. PRDGen AI explicitly generates anti-requirements.
4. **No validation mechanism** — Traditional PRDs have no way to verify whether the spec, once implemented, actually satisfies the user. PRDGen AI generates a validation harness — concrete scenarios the user can run against the built software.
5. **No implementation sequencing** — Traditional PRDs list features as a flat set. AI agents need dependency-ordered phases. PRDGen AI generates a phased build plan.

---

## 4. Implementation Phases (Dependency-Ordered)

Each phase below is independently testable. An AI coding agent should complete and validate each phase before proceeding to the next. Phase acceptance criteria use Given/When/Then format.

### Phase 0: Project Foundation + Research

**What:** Initialize Next.js 14+ project with App Router. Configure TypeScript, Tailwind CSS, ESLint. Set up Vercel deployment pipeline. Research and document specific Markdown format requirements for Cursor (.cursorrules context) vs. Claude Code (CLAUDE.md context).

**Dependencies:** None
**Outputs:** Running Next.js app deployed to Vercel; research document capturing Cursor and Claude Code spec format differences with concrete examples.

**Acceptance Criteria:**
- Given a fresh clone, when `npm run dev` is executed, then the app renders a landing page at localhost:3000 within 5 seconds
- Given the Vercel deployment, when a push to `main` occurs, then the app is live at the production URL within 3 minutes
- Given the research document, when reviewed, then it contains >=3 concrete format differences between Cursor and Claude Code spec consumption with examples of each

**Anti-Requirements:**
- Must NOT use Pages Router (App Router only)
- Must NOT introduce a CSS-in-JS library (Tailwind only)
- Must NOT add authentication or database in this phase

---

### Phase 1: Data Model + Session State

**What:** Define the core data model for a PRD session. A session contains: user input (raw idea text), checklist state (which sections are complete, skipped, or pending), conversation history (user + AI messages), generated PRD content (per-section), quality score (per-dimension + aggregate), and export metadata. Implement session persistence using browser localStorage for MVP (no backend DB).

**Dependencies:** Phase 0
**Outputs:** TypeScript types/interfaces for all data models; session state management via React Context + useReducer; session persistence to localStorage with auto-save on every state change.

**Data Model (explicit schema):**

```typescript
interface PRDSession {
  id: string;                          // UUID v4
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
  status: 'interviewing' | 'generating' | 'scoring' | 'complete';
  userInput: {
    rawIdea: string;                   // Original user prompt, max 5000 chars
    attachments: string[];             // Future: URLs to uploaded docs (empty for MVP)
  };
  checklist: ChecklistState;
  conversation: ConversationMessage[];
  prd: GeneratedPRD | null;
  qualityScore: QualityScore | null;
  exportHistory: ExportRecord[];
}

interface ChecklistState {
  sections: {
    [key in ChecklistSection]: {
      status: 'pending' | 'complete' | 'skipped';
      completedAt: string | null;
      data: Record<string, unknown>;   // Section-specific structured data
    };
  };
  completionPercentage: number;        // Calculated: (complete / total) * 100, skipped sections count as 0
}

type ChecklistSection =
  | 'problem_evidence'      // Weight: 15% -- required
  | 'personas'              // Weight: 15% -- required
  | 'user_stories'          // Weight: 15% -- required
  | 'features_prioritized'  // Weight: 15% -- required
  | 'tech_constraints'      // Weight: 10% -- required
  | 'anti_requirements'     // Weight: 10% -- required
  | 'success_metrics'       // Weight: 10% -- required
  | 'risks_dependencies'    // Weight: 5%  -- optional
  | 'validation_scenarios'  // Weight: 5%  -- auto-generated, user-editable

// Completion rules:
// - "required" sections that are skipped count as 0% toward their weight
// - "optional" sections that are skipped still count their full weight
// - Overall completion = sum of (weight * (1 if complete, 0 if skipped or pending))
// - Export unlocks at >=75% completion (all required sections complete)
//   OR user can force-export with warning at any completion level

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  relatedSection: ChecklistSection | null;  // Which checklist section this message addresses
}

interface GeneratedPRD {
  version: number;                     // Increments on each regeneration
  sections: {
    overview: string;
    personas: string;
    userStories: string;
    features: string;
    techRequirements: string;
    antiRequirements: string;
    successMetrics: string;
    risks: string;
    outOfScope: string;
    implementationPhases: string;
    validationHarness: string;
  };
  generatedAt: string;
}

interface QualityScore {
  dimensions: {
    clarity: number;           // 0-10
    completeness: number;      // 0-10
    testability: number;       // 0-10
    agentReadiness: number;    // 0-10
  };
  aggregate: number;           // Weighted average: clarity 30%, completeness 25%, testability 25%, agentReadiness 20%
  issues: QualityIssue[];
  passesScenarioValidation: boolean;
}

interface QualityIssue {
  section: string;
  severity: 'blocker' | 'warning' | 'suggestion';
  message: string;
  autoFixAvailable: boolean;
}

interface ExportRecord {
  exportedAt: string;
  format: 'markdown' | 'pdf';
  agentTarget: 'cursor' | 'claude_code' | 'generic';
  qualityScoreAtExport: number;
  scenarioValidationAtExport: boolean;
}
```

**Acceptance Criteria:**
- Given a new session is created, when the session state is inspected, then all checklist sections are 'pending' and completionPercentage is 0
- Given a user completes 3 required sections and skips 1, when completionPercentage is calculated, then it equals the sum of completed section weights (not a simple count ratio)
- Given a session exists with data, when the browser is refreshed, then the session state is fully restored from localStorage with no data loss
- Given a session has 5+ conversation messages, when a new message is added, then the relatedSection field correctly maps to the checklist section being discussed

**Anti-Requirements:**
- Must NOT use a backend database or API for session storage in MVP
- Must NOT store session data beyond the user's browser (no server-side persistence)
- Must NOT allow session IDs to be guessable (use UUID v4, not sequential integers)

---

### Phase 2: Checklist Engine + Gap Detection

**What:** Implement the intelligence layer that analyzes user input and determines which checklist sections are missing, incomplete, or vague. This is the core differentiator — it transforms a raw idea into a structured set of gaps to fill.

**Dependencies:** Phase 1
**Outputs:** A `ChecklistEngine` module that accepts raw user input + current checklist state and returns: (a) which sections are already addressed (with extracted data), (b) which sections are missing, (c) for each missing section, a prioritized question to ask the user, (d) for each addressed section, a confidence score (0-1) indicating completeness.

**How gap detection works (algorithm):**
1. Send user's raw idea text to the LLM with a structured prompt that extracts section-specific data
2. LLM returns a JSON object mapping each checklist section to: `{ addressed: boolean, confidence: 0-1, extractedData: {...}, gaps: string[] }`
3. Sections with `addressed: true` and `confidence >= 0.7` are marked 'complete'
4. Sections with `addressed: true` and `confidence < 0.7` need clarifying questions
5. Sections with `addressed: false` need full questions
6. Questions are prioritized: required sections first, then by weight descending

**LLM prompt structure for gap detection:**

```
You are analyzing a product idea to determine which PRD sections are addressed.

User's idea: "{rawIdea}"

For each section below, determine:
1. Is it addressed in the user's input? (true/false)
2. Confidence that it's sufficiently detailed (0.0-1.0)
3. What specific data can be extracted?
4. What specific gaps remain?

Sections to evaluate:
- problem_evidence: Is there a clear problem statement with evidence?
- personas: Are target users described with enough detail to infer needs, pain points, and goals?
- user_stories: Are there describable user workflows or interactions?
- features_prioritized: Are features mentioned? Can they be prioritized?
- tech_constraints: Are there technology preferences, performance requirements, or platform targets?
- anti_requirements: Are there any "must not" constraints mentioned?
- success_metrics: Are there measurable outcomes or KPIs?
- risks_dependencies: Are risks, assumptions, or external dependencies mentioned?

Respond in JSON only. No preamble, no markdown fences.
```

**Acceptance Criteria:**
- Given the input "I want to build a todo app", when gap detection runs, then `problem_evidence`, `personas`, `anti_requirements`, `success_metrics`, and `validation_scenarios` are all flagged as `addressed: false`
- Given the input "I want to build a todo app for busy parents who forget school events. Must work offline. Should NOT sync to any third-party cloud without explicit consent.", when gap detection runs, then `personas` has confidence >= 0.5, `anti_requirements` has confidence >= 0.7, and `tech_constraints` has confidence >= 0.3
- Given gap detection returns 5 unaddressed sections, when questions are prioritized, then required sections appear before optional sections and higher-weight sections appear before lower-weight sections within the same priority tier
- Given the LLM returns malformed JSON, when gap detection processes the response, then it retries once with a simplified prompt and falls back to marking all sections as 'pending' if retry fails (no crash, no hang)

**Anti-Requirements:**
- Must NOT make more than 2 LLM API calls per gap detection run (1 primary + 1 retry max)
- Must NOT block the UI while waiting for gap detection — show a loading state with progress indicator
- Must NOT hallucinate extracted data — if the user didn't mention personas, do not invent them. Flag as missing.

---

### Phase 3: Guided Interview UI + Conversation Flow

**What:** Build the chat-based interface where the user interacts with the gap detection engine. The interview is a conversation, not a form. The AI presents one question at a time (derived from the checklist engine), offers smart defaults the user can approve/edit, and updates the checklist in real time.

**Dependencies:** Phase 1, Phase 2
**Outputs:** Chat interface with: message history, real-time checklist progress sidebar, skip button per question, smart default suggestions, section-by-section completion indicators.

**Conversation flow (state machine):**

```
[START] -> User enters raw idea
        -> System runs gap detection (Phase 2)
        -> System identifies highest-priority missing section
        -> System asks targeted question with smart default

[QUESTION_PRESENTED]
  -> User responds with text -> System extracts data, updates checklist, moves to next gap
  -> User clicks "Approve default" -> System uses default, marks section complete, moves to next gap
  -> User clicks "Skip" -> System marks section 'skipped', moves to next gap
  -> User clicks "Edit default" -> System presents editable version of default, user submits

[CHECK_COMPLETION]
  -> If all required sections complete (or completion >= 75%) -> offer to generate PRD
  -> If gaps remain -> loop back to [QUESTION_PRESENTED] with next priority question
  -> If user has skipped 3+ required sections -> warn that quality score will be impacted, continue

[GENERATE_PRD] -> Phase 4
```

**Smart default behavior (specific rules):**
- **Personas:** If user mentions a target audience, the system infers 2 personas with name, background, pain, goal, and anti-goal. Presented as: "Based on your description, here are 2 personas I've inferred. Approve, edit, or add more?"
- **Tech constraints:** If user mentions a framework, the system infers a stack. If no framework mentioned, suggest defaults.
- **Anti-requirements:** The system always generates 3-5 anti-requirements based on the product type, even if the user didn't mention any.
- **Success metrics:** The system suggests 3 KPIs based on the product type.

**UI layout:**
- Left panel (70% width): Chat conversation with message history, input field, send button
- Right panel (30% width): Checklist progress — each section shows status icon, section name, and weight percentage. Overall completion bar at top.
- Bottom of right panel: "Generate PRD" button — enabled when completion >= 75%, disabled but visible otherwise with tooltip showing what's missing
- Mobile (< 768px): Checklist panel collapses to a top progress bar, expandable via tap

**Acceptance Criteria:**
- Given a user enters "I want to build a habit tracker app", when the first question is presented, then it appears within 5 seconds and addresses the highest-weight missing required section
- Given a user approves a smart default for personas, when the checklist updates, then the personas section shows complete and the completion percentage increases by the section weight (15%)
- Given a user skips 4 required sections, when they attempt to generate, then a warning modal appears stating the impact on quality
- Given 5+ messages in the conversation, when the user scrolls up, then older messages are visible and the input field remains fixed at the bottom
- Given a user is on mobile (viewport < 768px), when the page loads, then the checklist panel collapses to a top progress bar and is expandable via tap

**Anti-Requirements:**
- Must NOT ask more than 10 questions total per session (including follow-ups)
- Must NOT present multiple questions at once. One question per turn, always.
- Must NOT lose conversation history on page refresh (restore from localStorage)
- Must NOT auto-advance without user action (no timeouts that skip questions)

---

### Phase 4: NLSpec PRD Generation

**What:** Generate the full PRD/NLSpec document from the completed checklist data. The output format is designed to be directly consumable by AI coding agents — not just human-readable, but agent-executable.

**Dependencies:** Phase 1, Phase 2, Phase 3
**Outputs:** A structured Markdown document with all sections populated from checklist data + LLM expansion.

**Generated PRD template sections (in this exact order):**
1. Overview & Problem Statement
2. User Personas (2-4 with Name, Background, Pain, Goal, Anti-Goal)
3. User Stories & Acceptance Criteria (GWT format with edge cases)
4. Prioritized Features (MoSCoW: Must Have / Should Have / Could Have / Won't Have)
5. Anti-Requirements (Must NOT constraints)
6. Technical & Non-Functional Requirements
7. Implementation Phases (dependency-ordered with GWT acceptance criteria per phase)
8. Success Metrics & KPIs
9. Risks, Dependencies, Assumptions, Open Questions
10. Out of Scope
11. Validation Harness (3-5 end-to-end scenarios)

**How generation works:**
1. Collect all completed checklist section data into a single context object
2. Send to LLM with the template above as the target format
3. LLM generates each section, referencing the user's actual data (not hallucinating new requirements)
4. For sections the user skipped: generate minimal placeholder with `[SKIPPED -- not specified by user]` marker
5. Auto-generate the Implementation Phases section by analyzing feature dependencies
6. Auto-generate the Validation Harness by creating 3-5 end-to-end scenarios from the user stories
7. Auto-generate Anti-Requirements if user didn't provide them, based on common failure modes for the product type

**Acceptance Criteria:**
- Given all required checklist sections are complete, when PRD is generated, then every section in the template is populated with content derived from the user's checklist data (no hallucinated requirements)
- Given the user specified "React Native" as the tech stack, when the PRD is generated, then the Technical Requirements section references React Native and the Implementation Phases section sequences mobile-specific setup in Phase 0
- Given the user provided 3 user stories, when the PRD is generated, then the Validation Harness contains >=3 end-to-end scenarios that map to those stories
- Given the user skipped the "risks" section, when the PRD is generated, then the Risks section contains `[SKIPPED -- not specified by user]` and the quality score reflects the gap
- Given PRD generation is triggered, when the LLM responds, then the full PRD is rendered in a preview pane within 30 seconds

**Anti-Requirements:**
- Must NOT hallucinate features, personas, or requirements the user did not provide or approve
- Must NOT generate placeholder "lorem ipsum" content — every sentence must be specific to the user's product
- Must NOT produce a PRD longer than 3000 words for MVP-scope products (brevity = agent-friendliness)
- Must NOT omit the Anti-Requirements or Validation Harness sections even if the user didn't provide input — auto-generate sensible defaults

---

### Phase 5: Quality Scorer (Checklist + Scenario-Based)

**What:** Evaluate the generated PRD using two complementary methods: (a) a rubric-based checklist score (fast, deterministic) and (b) an LLM-as-judge scenario validation (deeper, probabilistic). The combination addresses StrongDM's insight that checklist-based testing alone is gameable.

**Dependencies:** Phase 4
**Outputs:** Quality score with per-dimension breakdown, specific issue list with fix suggestions, and scenario validation pass/fail.

**Scoring method 1: Rubric checklist (0-10 aggregate)**

| Dimension | Weight | Score 0 | Score 5 | Score 10 |
|-----------|--------|---------|---------|----------|
| Clarity | 30% | >=5 vague terms detected | 2-4 vague terms | 0 vague terms; all requirements use specific, measurable language |
| Completeness | 25% | >=3 required sections missing or skipped | 1-2 required sections skipped | All required sections complete with >=0.7 confidence |
| Testability | 25% | No GWT acceptance criteria | GWT present but missing edge cases | GWT present for all stories + edge cases + validation harness scenarios |
| Agent-Readiness | 20% | No anti-requirements, no phases, no constraints | Some anti-requirements OR phases present | Anti-requirements, implementation phases, tech constraints, and validation harness all present |

**Vague term detection (specific list for the clarity scanner):**
Flag these terms as vague when used without quantification: "fast", "slow", "clean", "simple", "intuitive", "user-friendly", "scalable", "robust", "efficient", "seamless", "smooth", "modern", "beautiful", "nice", "good", "easy", "flexible", "powerful", "lightweight", "responsive" (unless specifying a breakpoint).

For each flagged term, suggest a specific replacement. E.g.:
- "fast loading" -> "page load time < 2 seconds on 3G connection"
- "clean UI" -> "maximum 5 interactive elements per screen, consistent 8px grid spacing"
- "scalable" -> "supports 10,000 concurrent users without response time exceeding 500ms"

**Scoring method 2: Scenario validation (LLM-as-judge)**
After the rubric score is computed, run the following validation:
1. Take the generated PRD + 3 holdout scenarios (generated in Phase 4's Validation Harness section)
2. Send to a separate LLM call with a judge prompt that rates each scenario: PASS / PARTIAL / FAIL
3. Overall scenario validation passes if >= 2 of 3 scenarios rate PASS
4. If scenario validation fails, generate specific fix suggestions derived from the judge's reasoning

**Combined quality gate:**
- Export is unlocked (green button) when: rubric score >= 8/10 AND scenario validation passes
- Export is available with warning (yellow button) when: rubric score >= 6/10 OR scenario validation passes (either one)
- Export is blocked with override (red button with "Export Anyway" requiring confirmation) when: rubric score < 6/10 AND scenario validation fails

**Acceptance Criteria:**
- Given a PRD containing the phrase "the app should be fast and user-friendly", when the clarity scanner runs, then both "fast" and "user-friendly" are flagged with specific replacement suggestions
- Given a PRD with all sections complete and specific language, when the rubric runs, then the aggregate score is >= 8/10
- Given a PRD with 2 skipped required sections, when the rubric runs, then the completeness dimension scores <= 5/10
- Given a well-specified PRD, when scenario validation runs, then >=2 of 3 scenarios rate PASS and the LLM judge provides specific reasoning for each
- Given scenario validation returns FAIL, when the user views results, then specific fix suggestions are displayed with the exact gap identified

**Anti-Requirements:**
- Must NOT make more than 3 LLM API calls for scoring (1 for rubric analysis, 1 for scenario validation, 1 retry max)
- Must NOT display only the aggregate score — always show per-dimension breakdown
- Must NOT allow silent export of a PRD that scores < 4/10 (force confirmation with explicit warning text)

---

### Phase 6: Export Pipeline

**What:** Export the generated PRD as a clean Markdown file optimized for the user's target AI coding agent, or as a PDF fallback. The export includes agent-specific formatting and context-setting preamble.

**Dependencies:** Phase 4, Phase 5
**Outputs:** Downloadable .md or .pdf file; copy-to-clipboard functionality.

**Agent-specific formatting differences (researched in Phase 0, applied here):**

**Generic Markdown export:**
- Clean Markdown with standard headers, no agent-specific instructions
- Includes all sections from the template in Phase 4

**Cursor-optimized export:**
- Adds a preamble section: `## Agent Instructions` with Cursor-specific directives
- Includes: "Read this entire document before writing any code. Implement phases in order. Do not skip phases. After completing each phase, verify its acceptance criteria before proceeding."
- Formats implementation phases as numbered tasks Cursor's agent mode can checkpoint against
- Adds `.cursorrules` content suggestion as an appendix

**Claude Code-optimized export:**
- Adds a preamble referencing CLAUDE.md conventions
- Includes: "This is an NLSpec. Implement each phase sequentially. After each phase, run the acceptance criteria as self-checks. Report any ambiguities before proceeding — do not guess."
- Formats anti-requirements with emphasis markers Claude Code respects
- Adds `CLAUDE.md` content suggestion as an appendix

**Export flow:**
1. User clicks export -> modal presents format options (Markdown / PDF) and agent target (Generic / Cursor / Claude Code)
2. System applies agent-specific formatting
3. File is generated client-side (no server round-trip for MVP)
4. Download triggers automatically; copy-to-clipboard button also available
5. Export event logged to session history

**Acceptance Criteria:**
- Given the user selects "Cursor" as agent target, when the Markdown is exported, then it contains the Cursor-specific preamble and `.cursorrules` appendix
- Given the user selects "Claude Code" as agent target, when the Markdown is exported, then it contains the Claude Code-specific preamble and `CLAUDE.md` appendix
- Given any export, when the file is opened in a text editor, then it renders as valid Markdown with no broken formatting, no HTML artifacts, and no JSON remnants
- Given the user clicks "Copy to Clipboard", when they paste into Cursor/Claude Code, then the full PRD is pasted with formatting intact
- Given a PDF export, when opened in a PDF reader, then all sections are present with readable formatting and no truncation

**Anti-Requirements:**
- Must NOT require a server-side API call to generate the export file (client-side generation only for MVP)
- Must NOT include PRDGen AI branding or watermarks in the exported document body (a small "Generated by PRDGen AI" footer is acceptable)
- Must NOT strip the Validation Harness or Anti-Requirements sections from any export format

---

### Phase 7: Iterative Refinement + Version Diffing

**What:** After the first PRD is generated, allow the user to continue the conversation to refine specific sections. Each refinement produces a new version with visible diffs.

**Dependencies:** Phase 3, Phase 4, Phase 5
**Outputs:** Inline editing via chat; version history with diff view; re-scoring after each edit.

**Refinement flow:**
1. After PRD is generated and displayed, the chat input remains active
2. User can type natural-language edits: "Change persona 1 to focus on college students instead of parents", "Add a security requirement that all data must be encrypted at rest", "Remove the payment feature from P0"
3. System identifies which PRD section(s) are affected
4. System regenerates only the affected sections (not the full PRD)
5. Diff view shows previous version vs. new version (green = added, red = removed)
6. Quality score is re-run automatically after each edit
7. Version history is stored in the session (max 10 versions for MVP)

**Acceptance Criteria:**
- Given a generated PRD, when the user types "Add a requirement that the app must work offline", then the Tech Requirements section and relevant user stories are updated within 10 seconds
- Given an edit is applied, when the diff view is shown, then added content is highlighted green and removed content is highlighted red
- Given 3 edits have been made, when the user clicks "Version History", then all 3 versions are listed with timestamps and the user can view any previous version
- Given an edit changes a P0 feature, when the quality score re-runs, then the score reflects the change within 15 seconds

**Anti-Requirements:**
- Must NOT regenerate the entire PRD for a single-section edit (only regenerate affected sections)
- Must NOT allow more than 10 versions per session in MVP (prevent localStorage bloat)
- Must NOT auto-apply edits without showing the user the diff first

---

## 5. Should-Have (P1 -- Post-MVP)

- **Auto market/user research pull:** Web search integration to find competitor products, user complaints, and market data during the guided interview. Populate problem_evidence section with real citations.
- **Golden PRD library:** 5-10 example NLSpecs across different product types (SaaS, mobile app, API, game, CLI tool) that serve as: (a) user education, (b) evaluation benchmarks for the quality scorer, (c) reference exemplars for the LLM during generation.
- **Wireframe/prototype sketches:** Text-based or basic image generation of key screens referenced in user stories.
- **Export to Notion / Google Docs:** OAuth integration for direct export to user's workspace.
- **Agent execution feedback loop:** Opt-in telemetry where users report whether the exported PRD produced working code on first pass. Feeds back into quality scorer calibration.

---

## 6. Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Response time per guided question | < 5 seconds from user submit to AI response displayed | Client-side timestamp delta |
| Full PRD generation time | < 30 seconds | Client-side timestamp: generate click -> PRD rendered |
| Quality scoring time | < 15 seconds (rubric + scenario combined) | Client-side timestamp |
| Mobile responsiveness | Fully functional on viewports >= 375px width | Manual testing on iPhone SE, Pixel 5 viewport sizes |
| Data privacy | Zero server-side storage of user prompts or PRDs in MVP | Architecture review: confirm localStorage only, no API calls that persist data |
| Rate limiting | Free tier: 5 PRD generation+score cycles per 24 hours (tracked via localStorage counter + timestamp). No account required. | Client-side enforcement (honor system for MVP; server-side enforcement in post-MVP) |
| LLM API | Claude API (claude-sonnet-4-5-20250514 for generation and scoring) via server-side API route to protect API key | Vercel serverless function as proxy; API key in environment variable, never exposed to client |
| Accessibility | WCAG 2.1 AA compliance for core flows | Automated axe-core scanning + manual keyboard navigation testing |

**Tech Stack (MVP -- mandatory, not suggested):**

- **Framework:** Next.js 14+ with App Router, TypeScript strict mode
- **Styling:** Tailwind CSS (no additional CSS libraries)
- **State management:** React Context + useReducer (no Redux, no Zustand for MVP)
- **Persistence:** localStorage (no database for MVP)
- **LLM API:** Anthropic Claude API via Next.js API routes (serverless functions on Vercel)
- **Hosting:** Vercel (free tier sufficient for MVP)
- **Markdown rendering:** react-markdown with remark-gfm plugin
- **PDF generation:** Client-side via html2pdf.js or react-pdf
- **Diff rendering:** diff library (npm: diff) with custom styled output

---

## 7. Risks, Dependencies & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI over-prompts user -> abandonment | High | High | Hard cap at 10 questions per session. Progress bar showing "3 of ~7 questions remaining". Skip button on every question. Smart defaults reduce questions needed to 4-6 for well-described ideas. |
| LLM hallucinated requirements in generated PRD | Medium | Critical | Generation prompt explicitly instructs: "Only include requirements the user provided or approved. For sections the user skipped, output [SKIPPED]. Do not invent features." Post-generation, user reviews before export. |
| Low adoption due to perceived complexity | Medium | High | First-run experience: show a 15-second demo video of the flow. Offer a "Quick Mode" that uses maximum smart defaults and asks only 3-4 questions. |
| Vague term detection produces false positives | Medium | Low | Allow user to dismiss individual flags. Track dismissal rate to calibrate the scanner. Word "responsive" is not flagged if followed by a breakpoint value. |
| localStorage data loss (browser clear, device switch) | High | Medium | Warn user on first session: "Your PRDs are stored locally in this browser. Export to save permanently." Post-MVP: add optional account + cloud sync. |
| Claude API rate limits or downtime | Low | Critical | Implement retry with exponential backoff (max 3 retries). Show user-friendly error: "Our AI is temporarily busy. Your session is saved -- try again in 30 seconds." Cache LLM responses for repeated scoring of the same PRD version. |
| Exported PRD too long for agent context window | Medium | High | Enforce 3000-word max. Offer "compact mode" that strips explanatory text and keeps only structured spec data. Display word count during editing. |

**Dependencies:**
- Anthropic Claude API availability and pricing stability
- Vercel free tier capacity for MVP traffic
- Browser localStorage availability (not available in some privacy-focused browser configs -- detect and warn)

---

## 8. Success Metrics & Tracking (MVP)

All metrics tracked via lightweight client-side event logging (no third-party analytics for MVP -- use a simple JSON event log stored in localStorage, exportable by the user).

| Metric | Definition | Target | Priority |
|--------|-----------|--------|----------|
| Export completion rate | % of sessions that reach export | >= 50% | P0 |
| Quality score at export | Average aggregate score of exported PRDs | >= 8.0 | P0 |
| Scenario validation pass rate | % of exports where LLM-as-judge passes >=2/3 scenarios | >= 70% | P0 |
| Questions to export | Median number of questions asked before export | <= 7 | P0 |
| Time to export | Median time from session start to export | <= 3 minutes | P0 |
| Guided interview completion | % of sessions that answer >= 5 questions (proxy for engagement) | >= 70% | P1 |
| 7-day return rate | % of users who export >=1 PRD and return within 7 days | >= 60% | P1 |
| NPS | Score from post-export 1-question survey | >= 9 | P1 |

---

## 9. Out of Scope for MVP

- Team collaboration, sharing, or multi-user editing
- User accounts, authentication, or server-side user data storage
- Full REST/GraphQL API for third-party integrations
- Native voice input (rely on browser's built-in speech-to-text if available)
- Payment processing or subscription management
- Custom PRD templates (use the single NLSpec template defined in Phase 4)
- Integration with Cursor/Claude Code APIs (export is copy-paste; direct API integration is post-MVP)
- Automated agent execution testing (user manually runs the PRD through their agent; automated testing is post-MVP)

---

## 10. Acceptance Criteria for MVP Launch

### End-to-End Scenario 1: The Happy Path
**Setup:** New user visits PRDGen AI for the first time on desktop Chrome.
**Steps:** User types recipe sharing app idea -> answers 5-6 questions, approving 2 smart defaults -> clicks "Generate PRD" -> PRD generated within 30 seconds -> quality score >= 8/10 with scenario validation PASS -> exports for Claude Code as Markdown.
**Expected outcome:** Exported Markdown contains all 11 sections, Claude Code-specific preamble, no hallucinated features, validation harness with 3 scenarios mapping to user's workflows.
**Failure indicators:** Missing sections, hallucinated features, score < 6, broken formatting.

### End-to-End Scenario 2: The Skeptical Skipper
**Setup:** Experienced developer with detailed 300-word description.
**Steps:** System detects most sections addressed -> presents 2-3 questions -> user skips all -> generates at ~6/10 with scenario validation PARTIAL -> applies 2 fixes via chat -> score improves to 8/10 -> exports.
**Expected outcome:** System respects skips without nagging. Fix suggestions are specific and actionable. Iterative editing works without regenerating the full PRD.
**Failure indicators:** 10 questions despite detailed input, vague fix suggestions, full PRD regeneration on edit.

### End-to-End Scenario 3: The Mobile User
**Setup:** User on iPhone 14, Safari browser.
**Steps:** Navigate to PRDGen AI -> checklist as collapsible top bar -> complete interview via mobile keyboard -> generate PRD -> export.
**Expected outcome:** Full functionality on mobile. No layout breaks, no unresponsive buttons, no text truncation.
**Failure indicators:** Overlapping UI elements, chat input hidden behind keyboard, export button not accessible.

### End-to-End Scenario 4: The Edge Case Tester
**Setup:** User attempts to break the system.
**Steps:** 1-word idea "calculator" -> gibberish responses -> system asks clarification -> real answers -> mixed quality PRD generated.
**Expected outcome:** System handles minimal/garbage input gracefully. Never crashes. Never accepts gibberish as valid section data.
**Failure indicators:** System crashes, accepts "asdfgh" as a valid persona, hallucinates content to fill gaps.

### End-to-End Scenario 5: Session Recovery
**Setup:** User is mid-interview, 4 questions completed.
**Steps:** Close browser tab -> reopen PRDGen AI -> system detects saved session -> offers resume or fresh start -> user resumes -> all state intact.
**Expected outcome:** Zero data loss on browser close/refresh. Seamless resume.
**Failure indicators:** Session lost, partial data recovery, checklist state reset.

---

## 11. Golden PRD Reference Exemplars (Post-MVP, Planned)

To calibrate the quality scorer and provide the LLM with reference examples during generation, the following golden PRDs will be created as part of P1:

1. **SaaS Web App** -- Project management tool (covers: auth, CRUD, real-time collaboration, billing)
2. **Mobile App** -- Fitness tracker (covers: device sensors, offline mode, data visualization, notifications)
3. **API Product** -- Payment processing API (covers: security, idempotency, webhooks, rate limiting)
4. **Game** -- Multiplayer browser game (covers: real-time state sync, physics, matchmaking, anti-cheat)
5. **CLI Tool** -- Database migration tool (covers: file I/O, error recovery, rollback, dry-run mode)

Each golden PRD will follow the exact template from Phase 4 and will score 9+/10 on the quality rubric. These serve as both user education ("here's what a great spec looks like") and evaluation benchmarks for the scenario validation judge.

---

## 12. Agent Execution Instructions

To build PRDGen AI using this NLSpec, provide the following to your AI coding agent:

**For Claude Code:**
```
Read this entire NLSpec before writing any code. Implement phases 0-7 in strict sequential order.
After completing each phase, verify ALL acceptance criteria before proceeding to the next phase.
If any acceptance criterion is ambiguous, stop and ask for clarification -- do not guess.
Do not implement features from later phases while working on an earlier phase.
Respect all anti-requirements -- these are hard constraints, not suggestions.
```

**For Cursor:**
```
@file PRDGen_AI_NLSpec.md -- This is the complete specification for PRDGen AI.
Implement phases 0-7 sequentially. Do not skip phases.
After each phase, run the acceptance criteria as self-checks.
Respect the anti-requirements in each phase -- they are mandatory constraints.
Use the exact tech stack specified in Section 6 -- do not substitute libraries.
```
