/**
 * PRD Generation Engine — produces a GeneratedPRD from checklist data.
 * PRD.md §Phase 4.
 *
 * Constraints:
 * - Max 2 LLM calls per generation (1 primary + 1 retry)
 * - Must NOT hallucinate features, personas, or requirements
 * - Skipped sections: "[SKIPPED -- not specified by user]"
 * - Auto-generate: implementationPhases, validationHarness, antiRequirements, outOfScope
 * - Full generation < 30 seconds
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ChecklistSection, ChecklistSectionState, GeneratedPRD } from '@/lib/types/session';
import {
  buildChecklistContext,
  buildPRDGenerationPrompt,
  buildPRDRetryPrompt,
} from './prd-prompts';

const MODEL = 'claude-sonnet-4-5-20250929' as const;
const MAX_TOKENS = 4096 as const;

/** The 11 required keys in GeneratedPRD.sections. */
const PRD_SECTION_KEYS = [
  'overview',
  'personas',
  'userStories',
  'features',
  'antiRequirements',
  'techRequirements',
  'implementationPhases',
  'successMetrics',
  'risks',
  'outOfScope',
  'validationHarness',
] as const;

type PRDSectionKey = (typeof PRD_SECTION_KEYS)[number];

/**
 * Parse LLM text output as a PRD sections JSON object.
 * Strips markdown code fences if present and validates all 11 keys exist.
 */
export function parsePRDJson(
  text: string,
): Record<PRDSectionKey, string> | null {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const record = parsed as Record<string, unknown>;

    // Validate all 11 keys exist and are strings
    for (const key of PRD_SECTION_KEYS) {
      if (typeof record[key] !== 'string') return null;
    }

    return record as Record<PRDSectionKey, string>;
  } catch {
    return null;
  }
}

/**
 * Build a mock PRD from checklist data when the API is unavailable.
 * Produces structurally valid output so the UI flow works end-to-end.
 */
export function buildMockPRD(
  rawIdea: string,
  sections: Record<ChecklistSection, ChecklistSectionState>,
): GeneratedPRD {
  const skippedMarker = '[SKIPPED -- not specified by user]';

  /** Extract user text from a section's data object. */
  function getUserText(section: ChecklistSection): string {
    const state = sections[section];
    if (state.status === 'skipped') return skippedMarker;
    if (state.status === 'pending') return skippedMarker;

    const data = state.data;
    if (data.user_response && typeof data.user_response === 'string') {
      return data.user_response;
    }
    if (data.content && typeof data.content === 'string') {
      return data.content;
    }
    // Fallback: stringify all data
    const entries = Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null && v !== true)
      .map(([k, v]) => `- **${k}**: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    return entries.length > 0 ? entries.join('\n') : skippedMarker;
  }

  const isSkipped = (s: ChecklistSection) => sections[s].status === 'skipped' || sections[s].status === 'pending';

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sections: {
      overview: `# Overview & Problem Statement\n\n${rawIdea}\n\n${getUserText('problem_evidence') !== skippedMarker ? `## Problem Evidence\n${getUserText('problem_evidence')}` : ''}`,

      personas: isSkipped('personas')
        ? skippedMarker
        : `# User Personas\n\n${getUserText('personas')}`,

      userStories: isSkipped('user_stories')
        ? skippedMarker
        : `# User Stories & Acceptance Criteria\n\n${getUserText('user_stories')}`,

      features: isSkipped('features_prioritized')
        ? skippedMarker
        : `# Prioritized Features\n\n${getUserText('features_prioritized')}`,

      antiRequirements: isSkipped('anti_requirements')
        ? `# Anti-Requirements (Auto-Generated)\n\n- Must NOT collect user data beyond core functionality\n- Must NOT require account creation for basic features\n- Must NOT send notifications without explicit user opt-in`
        : `# Anti-Requirements\n\n${getUserText('anti_requirements')}`,

      techRequirements: isSkipped('tech_constraints')
        ? skippedMarker
        : `# Technical & Non-Functional Requirements\n\n${getUserText('tech_constraints')}`,

      implementationPhases: `# Implementation Phases\n\n## Phase 1: Foundation\n- Project setup, core data model, basic UI shell\n\n## Phase 2: Core Features\n- Implement must-have features from prioritized list\n\n## Phase 3: Polish & Validation\n- Quality improvements, testing, deployment`,

      successMetrics: isSkipped('success_metrics')
        ? skippedMarker
        : `# Success Metrics & KPIs\n\n${getUserText('success_metrics')}`,

      risks: isSkipped('risks_dependencies')
        ? `# Risks & Dependencies\n\n*No risks or dependencies specified by user.*`
        : `# Risks, Dependencies, Assumptions\n\n${getUserText('risks_dependencies')}`,

      outOfScope: `# Out of Scope\n\n*Inferred from anti-requirements and feature priorities. Refine during quality scoring.*`,

      validationHarness: `# Validation Harness\n\n## Scenario 1: Happy Path\n- **Setup**: New user visits the application\n- **Steps**: User completes the primary workflow end-to-end\n- **Expected**: All core features function correctly\n- **Failure indicators**: Errors, missing functionality, or broken UI\n\n## Scenario 2: Edge Case\n- **Setup**: User provides minimal or unusual input\n- **Steps**: Attempt core workflow with edge-case data\n- **Expected**: Graceful handling, clear error messages\n- **Failure indicators**: Crashes, data loss, or silent failures`,
    },
  };
}

/** Extract text from a message response's content array, with bounds check. */
function extractText(content: Anthropic.ContentBlock[]): string {
  if (content.length === 0) return '';
  return content[0].type === 'text' ? content[0].text : '';
}

/**
 * Generate a PRD from checklist data via the Anthropic API.
 * Max 2 LLM calls: primary + retry on malformed JSON.
 * Falls back to mock PRD if both calls fail or if the API throws.
 */
export async function generatePRD(
  rawIdea: string,
  sections: Record<ChecklistSection, ChecklistSectionState>,
): Promise<{ prd: GeneratedPRD; mock: boolean }> {
  const checklistContext = buildChecklistContext(sections);

  try {
    const client = new Anthropic();

    // --- Primary attempt ---
    const primaryResponse = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: 'You are a product specification writer. You generate structured NLSpec PRDs from guided interview data. Never invent information the user did not provide or approve. Return ONLY valid JSON.',
      messages: [
        { role: 'user', content: buildPRDGenerationPrompt(rawIdea, checklistContext) },
      ],
    });

    const primaryParsed = parsePRDJson(extractText(primaryResponse.content));
    if (primaryParsed) {
      return {
        prd: {
          version: 1,
          generatedAt: new Date().toISOString(),
          sections: primaryParsed,
        },
        mock: false,
      };
    }

    // --- Retry with simplified prompt ---
    const retryResponse = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: 'Return ONLY valid JSON. No other text.',
      messages: [
        { role: 'user', content: buildPRDRetryPrompt(rawIdea, checklistContext) },
      ],
    });

    const retryParsed = parsePRDJson(extractText(retryResponse.content));
    if (retryParsed) {
      return {
        prd: {
          version: 1,
          generatedAt: new Date().toISOString(),
          sections: retryParsed,
        },
        mock: false,
      };
    }
  } catch (err) {
    // Re-throw rate limit errors so the route handler can return 429
    if (err instanceof Anthropic.APIError && err.status === 429) {
      throw err;
    }
    // All other errors: fall through to mock fallback
  }

  // --- Fallback: mock PRD ---
  return { prd: buildMockPRD(rawIdea, sections), mock: true };
}
