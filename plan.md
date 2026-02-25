# Plan: Wire Conversation Engine to Real LLM Calls

## Problem

The guided interview is a form disguised as a chat. After the initial gap analysis (which does call Claude), every subsequent turn uses `processWithMock()` — returning hardcoded strings like "Got it — I've recorded your response." The LLM never sees the user's answers, never reflects on them, and never generates contextual guidance. This violates the PRD's core design: "The interview is a conversation, not a form."

## Goal

Every conversation turn calls Claude. The LLM:
1. Acknowledges what the user said with specific detail
2. Extracts structured data from the response
3. Transitions to the next question with context — referencing earlier answers and making recommendations for how the user might approach the next topic

## Files to Modify (3 files + types)

| File | Change |
|------|--------|
| `lib/types/conversation.ts` | Add `conversationHistory` and `checklistState` to `ConversationTurnRequest` |
| `lib/engine/conversation-engine.ts` | Replace `processWithMock()` with real Claude call; keep mock as fallback |
| `app/api/conversation/route.ts` | Pass new fields through; add `Anthropic.APIError` handling (429 etc.) |
| `app/interview/page.tsx` | Send `conversation` history + `checklist.sections` in fetch body |

## Step-by-Step Implementation

### Step 1: Extend `ConversationTurnRequest` type (`lib/types/conversation.ts`)

Add two new fields:
```typescript
export interface ConversationTurnRequest {
  rawIdea: string;
  userMessage: string;
  currentSection: ChecklistSection;
  action: UserAction;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;  // NEW
  completedSections: string[];  // NEW — list of section keys already done
  nextSection: ChecklistSection | null;  // NEW — so LLM can tailor transition
}
```

### Step 2: Build conversation prompt (`lib/engine/conversation-engine.ts`)

Add a new function `buildConversationPrompt()` that constructs the system prompt. The system prompt instructs Claude to:
- Act as a product spec interviewer
- Reference the user's original idea and what's been covered so far
- For the current section: acknowledge the user's answer specifically, extract key data points
- Transition to the next question naturally, with recommendations based on what's been discussed
- Return JSON: `{ "assistantMessage": "...", "extractedData": { ... } }`

Key prompt design:
```
You are DocHolliday, a product spec interviewer helping a user turn their rough idea into a structured PRD.

## User's Original Idea
"{rawIdea}"

## Sections Already Completed
{list of completed section names}

## Current Section: {sectionLabel}
The user is answering about: {sectionDescription}

## Next Section (if any): {nextSectionLabel}

## Your Task
1. Acknowledge the user's response with specificity — reference what they actually said
2. Extract structured data from their answer as key-value pairs
3. If there's a next section, transition naturally: explain what you'll cover next and offer a recommendation or insight based on what they've already shared

## Rules
- Do NOT invent requirements the user didn't state
- Keep your response conversational but concise (2-4 sentences for acknowledgment, 1-2 for transition)
- Extract data faithfully — if the user was vague, extract what you can and note the vagueness
- When making recommendations for the next section, ground them in the user's earlier answers
```

### Step 3: Implement `processWithClaude()` (`lib/engine/conversation-engine.ts`)

- Call `client.messages.create()` with the conversation prompt
- Parse the JSON response for `assistantMessage` and `extractedData`
- If parsing fails or API errors (non-429), fall back to `processWithMock()`
- Re-throw 429 errors for the route to handle

### Step 4: Update API route (`app/api/conversation/route.ts`)

- Accept `conversationHistory`, `completedSections`, `nextSection` from request body
- Pass them through to `processConversationTurn()`
- Add `Anthropic.APIError` handling: 429 → HTTP 429, other API errors → HTTP 502

### Step 5: Update interview page (`app/interview/page.tsx`)

In `handleAnswer`, `handleApproveDefault`, and `handleSkip` — add to the fetch body:
```typescript
conversationHistory: session.conversation.map(m => ({ role: m.role, content: m.content })),
completedSections: Object.entries(session.checklist.sections)
  .filter(([, s]) => s.status === 'complete')
  .map(([key]) => key),
nextSection: /* next section from gap analysis queue */
```

### Step 6: Update tests (`tests/conversation-engine.test.ts`)

- Existing mock tests still pass (mock is the fallback)
- Add tests for the prompt builder
- Add tests for JSON parsing of Claude responses

## What This Does NOT Change

- **Gap analysis** — already calls the LLM, stays as-is
- **Smart defaults UI** — `getSmartDefault()` stays as keyword-based for now; the LLM's contextual recommendations in the assistant message serve a similar purpose with much higher quality
- **Question queue** — still driven by the gap analysis result, not by the LLM
- **Max 10 questions** — still enforced client-side
- **PRD generation** — Phase 4 stays as-is

## LLM Call Budget

- Gap analysis: 1-2 calls (existing, unchanged)
- Per conversation turn: 1 call (new)
- Max 10 turns × 1 call = 10 calls per session
- PRD generation: 1-2 calls (existing, unchanged)
- Total session max: ~14 calls

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

**Turn 2 — User answers about problem_evidence (NEW: calls Claude)**

**User:** "Parents waste 20-30 minutes every evening figuring out what to cook. I've seen this in Reddit threads and my own family. Existing apps like AllRecipes are bloated and don't filter by actual prep time."

**Assistant (LLM-generated):** That's a strong problem statement — the 20-30 minute daily time sink is concrete and relatable, and you've grounded it in both personal experience and community signals from Reddit. The AllRecipes comparison is useful too — it gives us a clear "current alternative" to differentiate against.

Now let's talk about your target users. You mentioned "busy parents" — given the dinner-time pain point, I'd imagine they're juggling work and kids, primarily cooking on weeknights, and probably planning meals on their phone during commutes or breaks. Can you describe your target users in more detail? Think about: what's their cooking skill level, are they shopping for a family of 2 or 6, and what's their biggest frustration beyond just finding recipes?

> *Extracted data: `{ problem: "Parents waste 20-30 min daily deciding what to cook", evidence: ["Reddit community threads", "Personal family experience"], currentAlternatives: "AllRecipes — too bloated, doesn't filter by actual prep time", timeSink: "20-30 minutes per evening" }`*

**Turn 3 — User answers about personas**

**User:** "Two types: the weeknight warrior parent cooking for a family of 4 with 30 minutes max, and the meal prep planner who spends Sunday afternoon cooking for the whole week."

**Assistant (LLM-generated):** Great distinction — those are two clearly different usage patterns. The weeknight warrior needs speed and simplicity (filter by "under 30 min", minimal ingredients), while the meal prep planner needs batch-friendly recipes and a way to aggregate grocery lists across multiple meals. That difference will shape your feature priorities.

Next up: user stories. Given your two personas, walk me through what a typical session looks like for each. For example, how does the weeknight warrior discover a recipe at 5:30 PM, and how does the meal prep planner build their Sunday cooking plan? Think step-by-step — what do they tap, what do they see, what's the end result?

> *Extracted data: `{ persona1: { name: "Weeknight Warrior", familySize: 4, timeConstraint: "30 min max", pattern: "daily quick meals" }, persona2: { name: "Meal Prep Planner", pattern: "Sunday batch cooking for the week", needs: ["batch recipes", "aggregated grocery lists"] } }`*

**Turn 4 — User answers about user_stories**

**User:** "The weeknight parent opens the app, filters by 'under 30 min' and 'family of 4', picks a recipe, and taps 'add to grocery list'. The meal prepper searches for 'batch-friendly', selects 4-5 recipes, and the app merges all ingredients into one combined list they can share with their partner."

**Assistant (LLM-generated):** Those are clear, concrete workflows — especially the grocery list merge for the meal prepper, which is a differentiator from AllRecipes. I notice both flows end at the grocery list, which suggests that's a core feature, not a nice-to-have.

Let's prioritize your features. You've mentioned filtering by prep time, family size filtering, recipe saving, grocery list generation, list sharing, and batch meal planning with ingredient merging. Which of these are absolute must-haves for a first release, and which could wait? For context, a tighter MVP ships faster and lets you validate the core value prop — the prep-time filter and smart grocery list seem like they'd prove the concept on their own.

*...and so on through remaining sections, each time the LLM references previous answers and makes grounded recommendations.*

---

### Scenario 2: "Calculator" — The Minimal Input Edge Case

**User's idea:** "calculator"

**Turn 1 — Gap Analysis**

The LLM finds almost nothing — a single word. All sections are `addressed: false` with `confidence: 0`. The system presents the first question:

> **Assistant:** I've analyzed your idea — "calculator" is a starting point, but I'll need more detail to build a useful spec. Let me ask you a few targeted questions.
>
> What specific problem does your product solve, and what evidence do you have that this problem exists?

**Turn 2 — User answers about problem_evidence (NEW: calls Claude)**

**User:** "phone calculators suck for unit conversions"

**Assistant (LLM-generated):** That's a focused pain point — the default phone calculator handles arithmetic but unit conversions require switching to a separate app or Googling. That friction is real, especially for people who do conversions frequently.

To sharpen this: who specifically runs into this problem? A home cook converting tablespoons to cups is very different from an engineer converting metric to imperial on a job site. Can you describe who your target users are, what kinds of conversions they need, and when they typically need them?

> *Extracted data: `{ problem: "Phone calculators lack unit conversion", evidence: ["Common UX friction with built-in calculators"], currentAlternative: "Separate apps or Google search" }`*

**Turn 3 — User answers about personas**

**User:** "students doing physics homework mostly"

**Assistant (LLM-generated):** Got it — physics students dealing with unit conversions during homework. That narrows things nicely: they'd need conversions between metric/imperial, scientific notation, and likely physics-specific units (Newtons, Joules, Pascals). They're probably working from a textbook or problem set and want to stay in one app rather than context-switching.

Let's talk about workflows. Picture a student working through a physics problem set — they have a value in pounds-force and need it in Newtons, or they need to convert Celsius to Kelvin. How would they use your calculator? Do they type a value and pick units from dropdowns, or do they type something like "5 lbs to N"? Walk me through a typical interaction.

> *Extracted data: `{ persona: { name: "Physics student", context: "homework", conversionTypes: ["metric/imperial", "scientific units"] } }`*

**Turn 4 — User answers about user_stories**

**User:** "idk they just type it in and get the answer"

**Assistant (LLM-generated):** Fair enough — simplicity is the goal. So the core flow is: student types a value with a unit, the app recognizes the unit and shows converted equivalents instantly. No dropdowns, no extra steps. That's actually a strong UX opinion — a natural-language input rather than a form-based converter.

A few things that would help the PRD: does "type it in" mean something like "5 kg to lbs" (explicit conversion) or just "5 kg" and it shows all common conversions? And should it handle compound expressions like "5 m/s² × 10 kg"? Even a rough answer helps — we can keep the MVP simple.

For now, let's move on to features. Based on what you've described, the must-haves seem to be: (1) natural-language unit input, (2) instant conversion results, and (3) physics-relevant unit support. What else is essential for a first version, and what could wait?

> *Extracted data: `{ workflow: "Type value with unit, get instant conversion", inputStyle: "natural language, not dropdowns", openQuestion: "explicit target unit vs show all conversions" }`*

*Notice how the LLM:*
- *Doesn't accept vague answers uncritically — it interprets "idk they just type it in" as a UX decision (natural-language input)*
- *Asks a brief follow-up within the response to probe specifics*
- *Carries forward context (physics students → physics-relevant unit suggestions)*
- *Makes a concrete recommendation for features based on what's been discussed*
