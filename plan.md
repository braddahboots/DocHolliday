# Plan: Wire Conversation Engine to Real LLM Calls with Section Skills

## North Star Metric

> Given a PRD exported from DocHolliday, can an AI coding agent (Claude Code, Codex, Cursor) build a functional MVP on the first pass with zero follow-up questions, and does the output represent 99.99% of what the user actually wanted?

The measure is NOT "did we fill 9 sections" — it's "is each section precise enough that an agent won't hallucinate, guess, or ask clarifying questions?"

## Problem

The guided interview is a form disguised as a chat. After the initial gap analysis (which does call Claude), every subsequent turn uses `processWithMock()` — returning hardcoded strings like "Got it — I've recorded your response." The LLM never sees the user's answers, never reflects on them, and never generates contextual guidance. This violates the PRD's core design: "The interview is a conversation, not a form."

Worse: the mock engine accepts any input at face value. "idk they just type it in" gets the same "Got it!" as a detailed user story breakdown. There's no quality gate on individual sections — vague input flows through to vague PRDs, which produce vague code.

## Goal

Every conversation turn calls Claude with a **section-specific skill** that:
1. Acknowledges what the user said with specific detail
2. Extracts structured data matching an explicit schema for that section
3. **Validates agent-readiness** — probes for the specificity that prevents coding agents from guessing
4. Transitions to the next question with context grounded in earlier answers
5. Provides few-shot examples of what "good" looks like for that section

---

## Architecture: Section Skills

Each checklist section gets its own **skill** — a structured prompt fragment that makes the LLM an expert in that specific domain. This enables per-section fine-tuning without touching the conversation engine code.

### Skill Structure

```typescript
// lib/engine/section-skills/types.ts
export interface SectionSkill {
  section: ChecklistSection;

  // Prompt fragments
  role: string;                    // "You are a problem analyst..."
  sectionGoal: string;             // What this section needs to achieve for agents
  extractionSchema: string;        // JSON schema the LLM must populate
  qualityChecks: string[];         // Agent-readiness probes

  // Few-shot examples
  exampleUserAnswer: string;       // What a strong answer looks like
  exampleExtraction: string;       // What the extraction should produce
  exampleWeakAnswer: string;       // What a vague answer looks like
  exampleProbe: string;            // How to push back on vague input

  // Agent-readiness criteria
  agentReadinessTest: string;      // "Could an agent build X from this data alone?"
}
```

### Section Skills Detail

#### `problem_evidence`
- **Role:** Problem analyst
- **Agent-readiness test:** "Could an agent determine what to build and what NOT to build from this problem statement alone?"
- **Schema:** `{ problem: string, evidence: string[], currentAlternatives: string[], impactMetric: string, scopeBoundary: string }`
- **Quality checks:**
  - Is the problem specific (not "X sucks")?
  - Is there quantified evidence (numbers, sources)?
  - Are current alternatives named (so agent knows what to differentiate from)?
  - Is there a clear scope boundary (what this product is NOT)?
- **Weak answer probe:** User says "recipe apps suck" → LLM responds: "That's a start, but an AI coding agent would need to know *what specifically* sucks about them and *for whom*. Is it that they're slow to search? Too many ads? Don't filter by actual prep time? And who's frustrated — home cooks, meal preppers, parents with picky kids?"

#### `personas`
- **Role:** User researcher
- **Agent-readiness test:** "Could an agent make UX decisions (layout, features, copy) from these personas alone?"
- **Schema:** `{ personas: [{ name, background, pain, goal, antiGoal, context, frequency }] }`
- **Quality checks:**
  - Does each persona have a specific anti-goal (what they do NOT want)?
  - Is the usage context clear (when/where/how often they use the product)?
  - Are personas distinct enough to imply different UI paths?
- **Weak answer probe:** User says "busy parents" → LLM responds: "An AI agent building your app would need to know: busy in what way — working full-time, managing multiple kids, or both? What device are they on — phone during commute or laptop at home? And what's their cooking skill level — following recipes step-by-step or improvising? These details determine whether the agent builds a simple mobile-first recipe viewer or a full meal planning dashboard."

#### `user_stories`
- **Role:** UX flow mapper
- **Agent-readiness test:** "Could an agent derive routes, components, and API endpoints from these stories alone?"
- **Schema:** `{ stories: [{ persona, trigger, steps: string[], outcome, edgeCases: string[] }] }`
- **Quality checks:**
  - Are there concrete steps (not "they use the app")?
  - Is the trigger clear (what initiates the workflow)?
  - Are edge cases mentioned (what if the search returns no results)?
  - Could an agent map steps to UI components?
- **Weak answer probe:** User says "they just type it in and get the answer" → LLM responds: "That's a clear UX philosophy — minimal input, instant output. But an agent building this needs the specifics: does 'type it in' mean a single text input like '5 kg to lbs' or a structured form with fields? What happens if the unit isn't recognized? Is there a history of past conversions? Walk me through exactly what appears on screen at each step."

#### `features_prioritized`
- **Role:** Product prioritizer
- **Agent-readiness test:** "Could an agent determine what to build in sprint 1 vs sprint 2 from this prioritization alone?"
- **Schema:** `{ mustHave: string[], shouldHave: string[], couldHave: string[], wontHave: string[] }`
- **Quality checks:**
  - Is there a clear P0/P1/P2 distinction (not everything is must-have)?
  - Do must-haves map to user stories?
  - Are won't-haves listed (prevents agent from building unnecessary features)?
  - Are features specific enough to implement (not "good search")?
- **Weak answer probe:** User says "all of them are important" → LLM responds: "I understand they all feel important, but an AI agent needs a build order. If it tries to build everything at once, it'll produce shallow implementations of each feature rather than solid implementations of the critical ones. Looking at your user stories, the weeknight warrior's core flow needs [X] and [Y] — those seem like your day-one features. Could [Z] wait for version 2?"

#### `tech_constraints`
- **Role:** Technical advisor
- **Agent-readiness test:** "Could an agent set up the project (framework, database, hosting, CI) from these constraints alone?"
- **Schema:** `{ framework: string, language: string, platforms: string[], database: string, hosting: string, performanceTargets: Record<string, string>, constraints: string[] }`
- **Quality checks:**
  - Are framework/language specified (not just "modern stack")?
  - Are performance targets quantified (not "fast")?
  - Are platform targets clear (web, iOS, Android, desktop)?
  - Is the hosting preference stated?
- **Weak answer probe:** User says "React I guess" → LLM responds: "React is a solid choice. To give the agent enough to set up the project: React with TypeScript or JavaScript? Next.js (server-rendered) or Vite (SPA)? Any state management preference (Redux, Zustand, React Context)? And for the backend — does this need an API, or is it client-only? These choices determine the entire project scaffold."

#### `anti_requirements`
- **Role:** Constraint spotter
- **Agent-readiness test:** "Could an agent know what NOT to implement from these constraints alone?"
- **Schema:** `{ antiRequirements: [{ constraint: string, rationale: string }] }`
- **Quality checks:**
  - Are constraints specific (not "must not be slow")?
  - Are rationales provided (why this constraint exists)?
  - Do constraints cover data handling, auth, third-party dependencies?
- **Auto-generation guidance:** If user provides none, generate 3-5 based on product type and earlier answers. E.g., for a recipe app: "Must NOT require login to browse recipes", "Must NOT store user location data", "Must NOT depend on a single recipe API with no fallback."

#### `success_metrics`
- **Role:** Metrics designer
- **Agent-readiness test:** "Could an agent write automated tests or analytics instrumentation from these metrics alone?"
- **Schema:** `{ metrics: [{ name: string, target: string, measurement: string }] }`
- **Quality checks:**
  - Are metrics measurable (not "users like it")?
  - Are targets quantified (">60% completion rate", not "high")?
  - Is the measurement method clear (how would you check this)?
  - Can an agent instrument these metrics in code?
- **Weak answer probe:** User says "I want people to use it" → LLM responds: "Let's make that concrete so an agent can build analytics tracking. 'Use it' could mean: percentage of visitors who complete the core action (e.g., save a recipe) in their first session — target maybe >= 50%? Or: number of return visits within 7 days — target >= 30% retention? Pick 2-3 metrics that would tell you the product is working."

#### `risks_dependencies`
- **Role:** Risk analyst
- **Agent-readiness test:** "Could an agent add error handling, fallbacks, and dependency management from this section alone?"
- **Schema:** `{ risks: [{ risk, likelihood, mitigation }], dependencies: string[], assumptions: string[] }`
- **Quality checks:**
  - Are external dependencies identified (APIs, services, data sources)?
  - Are assumptions stated explicitly?
  - Are mitigations provided for key risks?

#### `validation_scenarios`
- **Role:** QA architect
- **Agent-readiness test:** "Could an agent write integration tests from these scenarios alone?"
- **Schema:** `{ scenarios: [{ name, setup, steps: string[], expected, failureIndicators: string[] }] }`
- **Quality checks:**
  - Are scenarios end-to-end (not unit-level)?
  - Is setup state clear (what exists before the test)?
  - Are failure indicators specific (what would prove it's broken)?
  - Do scenarios cover happy path AND edge cases?

---

## Files to Create/Modify

| File | Action | Change |
|------|--------|--------|
| `lib/engine/section-skills/types.ts` | **CREATE** | SectionSkill interface |
| `lib/engine/section-skills/index.ts` | **CREATE** | Registry: `SECTION_SKILLS: Record<ChecklistSection, SectionSkill>` |
| `lib/engine/section-skills/problem-evidence.ts` | **CREATE** | Skill for problem_evidence |
| `lib/engine/section-skills/personas.ts` | **CREATE** | Skill for personas |
| `lib/engine/section-skills/user-stories.ts` | **CREATE** | Skill for user_stories |
| `lib/engine/section-skills/features-prioritized.ts` | **CREATE** | Skill for features_prioritized |
| `lib/engine/section-skills/tech-constraints.ts` | **CREATE** | Skill for tech_constraints |
| `lib/engine/section-skills/anti-requirements.ts` | **CREATE** | Skill for anti_requirements |
| `lib/engine/section-skills/success-metrics.ts` | **CREATE** | Skill for success_metrics |
| `lib/engine/section-skills/risks-dependencies.ts` | **CREATE** | Skill for risks_dependencies |
| `lib/engine/section-skills/validation-scenarios.ts` | **CREATE** | Skill for validation_scenarios |
| `lib/types/conversation.ts` | **MODIFY** | Add conversationHistory, completedSections, nextSection |
| `lib/engine/conversation-engine.ts` | **MODIFY** | Add processWithClaude(), compose base prompt + section skill |
| `app/api/conversation/route.ts` | **MODIFY** | Pass new fields, add API error handling |
| `app/interview/page.tsx` | **MODIFY** | Send conversation history + checklist state |
| `tests/conversation-engine.test.ts` | **MODIFY** | Add tests for prompt builder, JSON parsing |
| `tests/section-skills.test.ts` | **CREATE** | Test that all skills have required fields, schemas parse |
| `CODEBASE_OVERVIEW.md` | **MODIFY** | Add section-skills directory |

## Prompt Composition

The conversation engine composes the final prompt like this:

```
SYSTEM PROMPT = BASE_INTERVIEWER_PROMPT
              + SECTION_SKILL[currentSection].systemPromptFragment
              + FEW_SHOT_EXAMPLES[currentSection]
              + AGENT_READINESS_DIRECTIVE

MESSAGES = conversationHistory + [{ role: 'user', content: userMessage }]
```

The **base interviewer prompt** handles:
- DocHolliday identity and conversational tone
- Reference to rawIdea and completed sections
- Transition guidance to nextSection
- JSON response format requirement

The **section skill fragment** handles:
- Section-specific extraction schema
- Quality checks to probe for
- Agent-readiness test to evaluate against

The **few-shot examples** handle:
- Good answer → good extraction (teaches the LLM what quality looks like)
- Weak answer → probe (teaches the LLM to push back on vagueness)

The **agent-readiness directive** handles:
- The overarching goal: "Every piece of data you extract will be fed to an AI coding agent that must implement a working MVP without asking any follow-up questions. If the user's answer is too vague for an agent to act on, say so and ask for specifics."

## LLM Call Budget

- Gap analysis: 1-2 calls (existing, unchanged)
- Per conversation turn: 1 call (new)
- Max 10 turns × 1 call = 10 calls per session
- PRD generation: 1-2 calls (existing, unchanged)
- Total session max: ~14 calls

## What This Does NOT Change

- **Gap analysis** — already calls the LLM, stays as-is
- **Question queue** — still driven by the gap analysis result, not by the LLM
- **Max 10 questions** — still enforced client-side
- **PRD generation** — Phase 4 stays as-is (but benefits from higher-quality extracted data)
- **Quality scorer** — Phase 5 stays as-is

## Implementation Order

1. Create `lib/engine/section-skills/types.ts` (interface)
2. Create all 9 section skill files
3. Create `lib/engine/section-skills/index.ts` (registry)
4. Modify `lib/types/conversation.ts` (add fields)
5. Modify `lib/engine/conversation-engine.ts` (add processWithClaude, prompt composition)
6. Modify `app/api/conversation/route.ts` (pass fields, error handling)
7. Modify `app/interview/page.tsx` (send history + state)
8. Create `tests/section-skills.test.ts`
9. Update `tests/conversation-engine.test.ts`
10. Update `CODEBASE_OVERVIEW.md`

---

## Scenario Walkthroughs

### Scenario 1: "Recipe Sharing App" — The Detailed Starter

**User's idea:** "I want to build a recipe sharing app for busy parents who need quick dinner ideas. It should let users save recipes, filter by prep time, and share grocery lists with family members."

**Turn 1 — Gap Analysis (existing, unchanged)**

The LLM analyzes the idea and identifies:
- `personas`: partially addressed (confidence 0.5) — "busy parents" mentioned but lacks depth
- `features_prioritized`: partially addressed (confidence 0.4) — features mentioned but no prioritization
- `problem_evidence`: not addressed — no evidence the problem exists
- Other sections: not addressed

System presents the first question (highest-weight required section):

> **Assistant:** I've analyzed your idea and identified some areas to cover. You've mentioned a clear audience and some features — nice start. Let me ask you a few targeted questions.
>
> What specific problem does your product solve, and what evidence do you have that this problem exists?

**Turn 2 — User answers about problem_evidence**

Active skill: `problem-evidence` (problem analyst)

**User:** "Parents waste 20-30 minutes every evening figuring out what to cook. I've seen this in Reddit threads and my own family. Existing apps like AllRecipes are bloated and don't filter by actual prep time."

**LLM processing (internal):**
- Skill checks: specific problem? ✓ (20-30 min daily). Quantified evidence? ✓ (Reddit, personal). Current alternatives? ✓ (AllRecipes). Scope boundary? ✗ (not stated yet — but enough to proceed)
- Agent-readiness test: "Could an agent determine what to build and NOT build from this?" → Yes — the differentiation from AllRecipes (prep-time filtering, not bloated) gives clear direction

**Assistant (LLM-generated):** That's a strong problem statement — the 20-30 minute daily decision fatigue is concrete and the AllRecipes comparison gives a clear differentiation target: lightweight, prep-time-first, no bloat. An AI agent building this would know to prioritize filtering speed over recipe volume.

Now let's define your users precisely. You mentioned "busy parents" — but an agent building the UI needs to know more: are these parents who follow recipes step-by-step (need detailed instructions) or experienced cooks who just need ingredients and a rough method? Are they planning on mobile during a commute or at home on a laptop? Those details determine whether the agent builds a quick-glance mobile app or a full desktop planning tool.

> *Extracted data:*
> ```json
> {
>   "problem": "Parents waste 20-30 minutes daily deciding what to cook",
>   "evidence": ["Reddit community threads", "Personal family experience"],
>   "currentAlternatives": ["AllRecipes — bloated UI, doesn't filter by actual prep time"],
>   "impactMetric": "20-30 minutes per evening",
>   "scopeBoundary": "Lightweight prep-time-first recipe discovery, not a full social cooking platform"
> }
> ```

**Turn 3 — User answers about personas**

Active skill: `personas` (user researcher)

**User:** "Two types: the weeknight warrior parent cooking for a family of 4 with 30 minutes max, and the meal prep planner who spends Sunday afternoon cooking for the whole week."

**LLM processing (internal):**
- Skill checks: distinct personas? ✓. Anti-goals? ✗. Usage context? Partial (weeknight vs Sunday). Device/frequency? ✗
- Agent-readiness test: "Could an agent make UX decisions from these?" → Partially — knows there are 2 distinct flows, but doesn't know device or anti-goals

**Assistant (LLM-generated):** Two clearly different usage patterns — the weeknight warrior needs speed (filter → pick → cook in under 5 minutes of app time), while the meal prep planner needs batch planning (select multiple recipes → merge ingredients → share list). An agent would build two distinct user flows for these.

Two things that would help the agent nail the UX: First, what should each persona NOT experience? For example, the weeknight warrior probably doesn't want to see recipes that require specialty ingredients or 2-hour marinades. The meal prepper probably doesn't want to re-enter recipes they've already saved. Second, are both using the app primarily on their phone, or does the meal prepper use a laptop/tablet for Sunday planning?

> *Extracted data:*
> ```json
> {
>   "personas": [
>     {
>       "name": "Weeknight Warrior",
>       "background": "Parent, family of 4, cooks weeknight dinners",
>       "pain": "No time to decide what to cook, needs meals ready in 30 min",
>       "goal": "Find a recipe and generate grocery list in under 5 min of app time",
>       "antiGoal": "Does NOT want to browse endlessly or see complex/specialty recipes",
>       "context": "Weeknight evenings, likely on phone",
>       "frequency": "Daily"
>     },
>     {
>       "name": "Meal Prep Planner",
>       "background": "Experienced cook, plans meals for the entire week",
>       "pain": "Managing multiple recipes and combining ingredient lists manually",
>       "goal": "Select 4-5 batch recipes and get one merged grocery list to share",
>       "antiGoal": "Does NOT want to re-enter previously saved recipes",
>       "context": "Sunday afternoon, possibly on tablet/laptop",
>       "frequency": "Weekly"
>     }
>   ]
> }
> ```

**Turn 4 — User answers about user_stories**

Active skill: `user-stories` (UX flow mapper)

**User:** "The weeknight parent opens the app, filters by 'under 30 min' and 'family of 4', picks a recipe, and taps 'add to grocery list'. The meal prepper searches for 'batch-friendly', selects 4-5 recipes, and the app merges all ingredients into one combined list they can share with their partner."

**LLM processing (internal):**
- Skill checks: concrete steps? ✓. Trigger? ✓ (opens app). Edge cases? ✗ (what if no results match filters? what if an ingredient is already in the pantry?)
- Agent-readiness test: "Could an agent derive routes and components from these?" → Yes for happy path, needs edge cases

**Assistant (LLM-generated):** Clear workflows — an agent could map these directly to screens:

*Weeknight flow:* Home → Filter panel (prep time + servings) → Results list → Recipe detail → "Add to grocery list" CTA
*Meal prep flow:* Home → Search "batch-friendly" → Multi-select results → "Merge & share list" CTA → Share sheet

The grocery list merge is your differentiator — an agent would need to know: does "merge" mean combining "2 cups flour" + "1 cup flour" into "3 cups flour" (smart deduplication), or just a flat combined list? And two edge cases the agent will need to handle: what happens when the filter returns zero results? And can the weeknight warrior see what's already on their existing grocery list before adding more?

*...continues through remaining sections...*

---

### Scenario 2: "Calculator" — The Minimal Input Edge Case

**User's idea:** "calculator"

**Turn 1 — Gap Analysis**

All sections `addressed: false`, confidence 0.

> **Assistant:** "calculator" is a starting point, but I'll need more detail to build a useful spec. What specific problem does your product solve, and what evidence do you have that this problem exists?

**Turn 2 — User answers about problem_evidence**

Active skill: `problem-evidence` (problem analyst)

**User:** "phone calculators suck for unit conversions"

**LLM processing (internal):**
- Skill checks: specific problem? Partial. Evidence? ✗. Current alternatives? Implicit (phone calculator). Scope boundary? ✗
- Agent-readiness test: "Could an agent determine what to build from this?" → No — "suck" is vague, no target user, no scope boundary

**Assistant (LLM-generated):** That's a focused pain point — the built-in calculator handles arithmetic but forces you to switch apps for unit conversions. But an agent building this would need to know: suck *how exactly*? Is it that they don't support unit conversion at all? That the conversion apps are too slow to open? That they don't support the specific units you need?

And crucially: what kind of unit conversions? Cooking (cups ↔ tablespoons), engineering (metric ↔ imperial), physics (Newtons ↔ pounds-force), or all of the above? The answer determines whether the agent builds a simple converter with 20 units or a comprehensive scientific calculator.

> *Extracted data:*
> ```json
> {
>   "problem": "Phone calculators lack unit conversion capability",
>   "evidence": [],
>   "currentAlternatives": ["Built-in phone calculator — no unit conversion"],
>   "impactMetric": "",
>   "scopeBoundary": ""
> }
> ```

**Turn 3 — User answers about personas**

Active skill: `personas` (user researcher)

**User:** "students doing physics homework mostly"

**LLM processing (internal):**
- Skill checks: distinct persona? Minimal. Anti-goal? ✗. Context? Partial (homework). Device? ✗
- Agent-readiness test: "Could an agent make UX decisions from this?" → No — agent wouldn't know whether to build a web app, mobile app, or browser extension

**Assistant (LLM-generated):** Physics students during homework — that narrows the unit set to physics-relevant conversions (SI units, Newtons, Joules, Pascals, Kelvin, etc.) and likely some math helpers (scientific notation, significant figures).

An agent building this needs to know three things:
1. **Device:** Are students using this on their phone while working from a textbook, or on their laptop alongside a problem set? That determines mobile-first vs desktop.
2. **Speed:** Is this a "quick lookup" tool they use 20 times during a homework session, or a "deep calculation" tool they use 2-3 times? Quick lookup means zero navigation — everything on one screen.
3. **Anti-goal:** What should this NOT be? A full graphing calculator? A formula reference? Just the converter?

> *Extracted data:*
> ```json
> {
>   "personas": [{
>     "name": "Physics Student",
>     "background": "Student taking physics courses",
>     "pain": "Needs frequent unit conversions during homework, current tools require app-switching",
>     "goal": "Convert between physics units quickly without leaving their workflow",
>     "antiGoal": "",
>     "context": "During homework sessions",
>     "frequency": "Multiple times per homework session"
>   }]
> }
> ```

**Turn 4 — User answers about user_stories**

Active skill: `user-stories` (UX flow mapper)

**User:** "idk they just type it in and get the answer"

**LLM processing (internal):**
- Skill checks: concrete steps? ✗. Trigger? ✗. Edge cases? ✗
- Agent-readiness test: "Could an agent derive routes and components from this?" → No

**Assistant (LLM-generated):** "Just type it in" is actually a strong UX decision — a single text input with instant results, no dropdowns or form fields. That's a natural-language interface, which is a real design choice.

But an agent needs the specifics to build it:
- **Input format:** Does the student type "5 kg to lbs" (explicit target), "5 kg" (show all common conversions), or "5 kg * 9.8 m/s²" (calculate and convert)? These are three different parsers.
- **Output format:** Just the number? The number with units? A list of equivalent values in related units?
- **Error state:** What if the student types something the app doesn't recognize — "5 zorps to blorps"? Show "unit not recognized" or suggest closest matches?
- **History:** Does the student need to see their last 10 conversions, or is each conversion independent?

Even a rough answer to these helps the agent build the right thing. Which of these feels closest to what you're imagining?

> *Extracted data:*
> ```json
> {
>   "stories": [{
>     "persona": "Physics Student",
>     "trigger": "Needs to convert a unit during homework",
>     "steps": ["Opens app", "Types value with unit", "Sees converted result"],
>     "outcome": "Gets the converted value instantly",
>     "edgeCases": []
>   }]
> }
> ```

*Notice how the section skill pushes the vague user toward specificity at every turn — not by being annoying, but by explaining WHY the agent needs each detail.*

---

## NLSpec Reference Material

### What is NLSpec?

NLSpec (Natural Language Specification) is a term coined by StrongDM for their Attractor project. Defined as "a human-readable spec intended to be directly usable by coding agents to implement/validate behavior." Key properties:

- Precise enough that an agent can process it consistently with little room for ambiguity
- Readable enough that a human can write and review it
- Not formal logic, not code — structured natural English with formal constraints

### Reference Examples

- **StrongDM Attractor:** [github.com/strongdm/attractor](https://github.com/strongdm/attractor) — 3 NLSpec files, ~6,000-7,000 lines, zero code. Uses RECORD/INTERFACE/ENUM notation, BNF grammars, pseudocode, comparison tables.
- **GitHub spec-kit:** [github.com/github/spec-kit](https://github.com/github/spec-kit) — Official toolkit for spec-driven development.
- **Addy Osmani's guide:** [addyosmani.com/blog/good-spec/](https://addyosmani.com/blog/good-spec/) — Best practices for writing specs AI agents can execute from.

### DocHolliday's NLSpec vs StrongDM's NLSpec

StrongDM's NLSpecs are **implementation specs** for developer tools (agent loops, LLM clients). They use formal notation (RECORD, INTERFACE, BNF).

DocHolliday generates **product PRDs** for consumer/SaaS apps. Our format uses personas, user stories, MoSCoW features, and validation scenarios. Different audience, same principle: precise enough that an agent doesn't guess.

### Gap: No Gold-Standard Example PRDs

We don't currently have hand-crafted "this is what a perfect DocHolliday output looks like" examples. This is needed for:
1. Few-shot examples in section skills (teach the LLM what quality looks like)
2. Few-shot examples in PRD generation (teach the LLM the target format)
3. Quality scorer calibration (what does a 9/10 PRD actually look like?)

**Recommendation:** Create 2-3 hand-crafted example PRD sections as part of this implementation, embedded in the section skill files as few-shot examples.
