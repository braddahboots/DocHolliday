/**
 * Structured prompts for NLSpec PRD generation.
 * PRD.md §Phase 4: generates all 11 template sections from checklist data.
 *
 * Constraints:
 * - Only include requirements the user provided or approved
 * - For skipped sections, output [SKIPPED -- not specified by user]
 * - Do NOT invent features, personas, or requirements
 * - Auto-generate Implementation Phases, Validation Harness, and Anti-Requirements if missing
 * - Max 3000 words total
 */

import type { ChecklistSection, ChecklistSectionState } from '@/lib/types/session';
import { CHECKLIST_SECTIONS, ALL_SECTIONS } from '@/lib/constants/checklist';

/** Mapping from checklist section keys to PRD template section names. */
const SECTION_LABEL_MAP: Record<ChecklistSection, string> = {
  problem_evidence: 'Overview & Problem Statement',
  personas: 'User Personas',
  user_stories: 'User Stories & Acceptance Criteria',
  features_prioritized: 'Prioritized Features',
  anti_requirements: 'Anti-Requirements',
  tech_constraints: 'Technical & Non-Functional Requirements',
  success_metrics: 'Success Metrics & KPIs',
  risks_dependencies: 'Risks, Dependencies, Assumptions, Open Questions',
  validation_scenarios: 'Validation Harness',
} as const;

/**
 * Serialize checklist section data into a structured context block for the LLM.
 * Skipped/pending sections are labeled as such.
 */
export function buildChecklistContext(
  sections: Record<ChecklistSection, ChecklistSectionState>,
): string {
  const lines: string[] = [];

  for (const section of ALL_SECTIONS) {
    const state = sections[section];
    const meta = CHECKLIST_SECTIONS[section];
    const label = SECTION_LABEL_MAP[section];

    if (state.status === 'skipped') {
      lines.push(`### ${label} (${meta.label})\nStatus: SKIPPED by user\n`);
    } else if (state.status === 'pending') {
      lines.push(`### ${label} (${meta.label})\nStatus: NOT ADDRESSED\n`);
    } else {
      // Complete — include extracted data
      const dataStr = Object.entries(state.data)
        .map(([key, value]) => {
          if (typeof value === 'string') return `- ${key}: ${value}`;
          return `- ${key}: ${JSON.stringify(value)}`;
        })
        .join('\n');
      lines.push(`### ${label} (${meta.label})\nStatus: COMPLETE\nUser-provided data:\n${dataStr}\n`);
    }
  }

  return lines.join('\n');
}

/**
 * Build the primary PRD generation prompt.
 * Instructs the LLM to generate all 11 template sections as a JSON object.
 */
export function buildPRDGenerationPrompt(
  rawIdea: string,
  checklistContext: string,
): string {
  return `You are generating a structured NLSpec PRD (Natural Language Specification) from a guided interview.

## User's Original Idea
"${rawIdea}"

## Interview Data (checklist sections)
${checklistContext}

## Your Task
Generate a complete PRD with exactly 11 sections, in this order. Each section should be valid Markdown content.

1. **overview** — Overview & Problem Statement: Summarize the product, the problem it solves, and the target market. Reference ONLY what the user provided.
2. **personas** — User Personas: 2-4 personas with Name, Background, Pain, Goal, Anti-Goal. Use the user's data; do NOT invent personas they didn't describe.
3. **userStories** — User Stories & Acceptance Criteria: Given/When/Then format with edge cases. Derive from user's described workflows.
4. **features** — Prioritized Features: MoSCoW format (Must Have / Should Have / Could Have / Won't Have). Use ONLY features the user described.
5. **antiRequirements** — Anti-Requirements: "Must NOT" constraints. If the user provided anti-requirements, use them. If they skipped this section, auto-generate 3-5 sensible constraints based on the product type. Always include this section.
6. **techRequirements** — Technical & Non-Functional Requirements: Tech stack, performance targets, platform requirements. Use the user's data or mark as unspecified.
7. **implementationPhases** — Implementation Phases: Dependency-ordered build phases with Given/When/Then acceptance criteria per phase. Auto-generate by analyzing feature dependencies.
8. **successMetrics** — Success Metrics & KPIs: Measurable outcomes with targets. Use the user's data or mark as unspecified.
9. **risks** — Risks, Dependencies, Assumptions, Open Questions: Use the user's data. If skipped, output a brief note.
10. **outOfScope** — Out of Scope: Infer from anti-requirements and feature priorities what is explicitly excluded.
11. **validationHarness** — Validation Harness: 3-5 end-to-end scenarios derived from the user stories. Each scenario should have: Setup, Steps, Expected Outcome, Failure Indicators. Always auto-generate this section.

## Rules
- For sections the user SKIPPED: output exactly "[SKIPPED -- not specified by user]"
- For sections the user completed: generate rich content based ONLY on their data. Do NOT hallucinate features, personas, or requirements they didn't provide or approve.
- EXCEPTION: antiRequirements, implementationPhases, outOfScope, and validationHarness should always be populated (auto-generated if user didn't provide input).
- Keep total output under 3000 words. Brevity = agent-friendliness.
- No placeholder or lorem ipsum text. Every sentence must be specific to this product.
- Use Markdown formatting (headers, bullet lists, bold) within each section.

## Response Format
Return ONLY a JSON object with exactly these 11 keys. No preamble, no markdown fences, no explanation outside the JSON.

{
  "overview": "...",
  "personas": "...",
  "userStories": "...",
  "features": "...",
  "antiRequirements": "...",
  "techRequirements": "...",
  "implementationPhases": "...",
  "successMetrics": "...",
  "risks": "...",
  "outOfScope": "...",
  "validationHarness": "..."
}`;
}

/**
 * Simplified retry prompt for when the primary response has malformed JSON.
 */
export function buildPRDRetryPrompt(
  rawIdea: string,
  checklistContext: string,
): string {
  return `Generate a PRD for this product idea. Return ONLY valid JSON with no other text.

Idea: "${rawIdea}"

Data from interview:
${checklistContext}

Return a JSON object with these exact 11 string keys: overview, personas, userStories, features, antiRequirements, techRequirements, implementationPhases, successMetrics, risks, outOfScope, validationHarness.

Each value is a Markdown string for that section. For skipped sections, use "[SKIPPED -- not specified by user]". Auto-generate implementationPhases, validationHarness, and antiRequirements if missing.

Return valid JSON only. No markdown fences.`;
}
