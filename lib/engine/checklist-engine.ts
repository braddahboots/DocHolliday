/**
 * ChecklistEngine — LLM-powered gap analysis for PRD sections.
 * PRD.md §Phase 2.
 *
 * Constraints:
 * - Max 2 LLM calls per run (1 primary + 1 retry)
 * - Must NOT hallucinate extracted data
 * - Malformed JSON: retry once with simplified prompt, fallback to all-pending
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ChecklistSection } from '@/lib/types/session';
import type {
  GapAnalysisRaw,
  GapAnalysisResult,
  PrioritizedQuestion,
  SectionAnalysis,
} from '@/lib/types/gap-analysis';
import { CHECKLIST_SECTIONS, ALL_SECTIONS } from '@/lib/constants/checklist';
import { buildPrimaryPrompt, buildRetryPrompt } from './prompts';

const MODEL = 'claude-sonnet-4-5-20250929' as const;
const MAX_TOKENS = 2048 as const;

/** Default section analysis when fallback is needed. */
function defaultSectionAnalysis(): SectionAnalysis {
  return {
    addressed: false,
    confidence: 0,
    extractedData: {},
    gaps: ['Unable to analyze — section pending user input'],
  };
}

/** Build a complete all-pending gap analysis (fallback). */
function allPendingAnalysis(): GapAnalysisRaw {
  return Object.fromEntries(
    ALL_SECTIONS.map((s) => [s, defaultSectionAnalysis()]),
  ) as GapAnalysisRaw;
}

/**
 * Attempt to parse LLM text output as GapAnalysisRaw JSON.
 * Strips markdown code fences if present.
 */
export function parseGapAnalysisJson(text: string): GapAnalysisRaw | null {
  // Strip markdown fences if the LLM wrapped its response
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const record = parsed as Record<string, unknown>;

    // Validate that all 9 sections exist with correct shape
    for (const section of ALL_SECTIONS) {
      const entry = record[section];
      if (typeof entry !== 'object' || entry === null) return null;

      const e = entry as Record<string, unknown>;
      if (typeof e.addressed !== 'boolean') return null;
      if (typeof e.confidence !== 'number' || e.confidence < 0 || e.confidence > 1) return null;
      if (typeof e.extractedData !== 'object' || e.extractedData === null) return null;
      if (!Array.isArray(e.gaps)) return null;
    }

    return parsed as GapAnalysisRaw;
  } catch {
    return null;
  }
}

/**
 * Generate a prioritized question for a section that needs more info.
 * PRD §Phase 2: "For each missing section: a prioritized question."
 */
function generateQuestion(
  section: ChecklistSection,
  analysis: SectionAnalysis,
): string {
  const questionMap: Record<ChecklistSection, { full: string; clarify: string }> = {
    problem_evidence: {
      full: 'What specific problem does your product solve, and what evidence do you have that this problem exists?',
      clarify: 'Can you provide more detail about the problem and any evidence (user complaints, market data, personal experience)?',
    },
    personas: {
      full: 'Who are the target users? Describe their background, pain points, and goals.',
      clarify: 'Can you tell me more about your target users — their specific needs, frustrations, and what they\'re trying to accomplish?',
    },
    user_stories: {
      full: 'What are the key workflows? Describe what a user would do step-by-step in your product.',
      clarify: 'Can you walk through a typical user session — what actions would they take and what would they expect to happen?',
    },
    features_prioritized: {
      full: 'What are the must-have features for the first version? What could wait for later?',
      clarify: 'You mentioned some features — which are absolutely essential for launch, and which are nice-to-have?',
    },
    tech_constraints: {
      full: 'Are there any technology preferences, platform requirements, or performance constraints?',
      clarify: 'Can you elaborate on the technical requirements — specific frameworks, platforms, or performance targets?',
    },
    anti_requirements: {
      full: 'Is there anything the product should explicitly NOT do? Any features or behaviors to avoid?',
      clarify: 'You hinted at some constraints — can you be more specific about what the product must NOT do?',
    },
    success_metrics: {
      full: 'How will you measure success? What specific metrics or KPIs matter?',
      clarify: 'Can you define concrete metrics — what numbers would tell you the product is succeeding?',
    },
    risks_dependencies: {
      full: 'Are there any known risks, assumptions, or external dependencies (APIs, services, data sources)?',
      clarify: 'Can you expand on the risks or dependencies you mentioned — what could go wrong or what do you depend on?',
    },
    validation_scenarios: {
      full: 'Describe 2-3 end-to-end scenarios that, if they work correctly, prove the product works.',
      clarify: 'Can you describe a few concrete test scenarios — "a user does X, then Y happens, and they see Z"?',
    },
  };

  const templates = questionMap[section];
  // Use clarifying question if partially addressed, full question if not addressed at all
  return analysis.addressed && analysis.confidence > 0
    ? templates.clarify
    : templates.full;
}

/**
 * Prioritize questions: required sections first, then by weight descending.
 * PRD §Phase 2 acceptance criteria #3.
 */
export function prioritizeQuestions(
  analysis: GapAnalysisRaw,
): PrioritizedQuestion[] {
  const questions: PrioritizedQuestion[] = [];

  for (const section of ALL_SECTIONS) {
    const sectionAnalysis = analysis[section];
    const meta = CHECKLIST_SECTIONS[section];

    // Skip sections that are fully addressed (confidence >= 0.7)
    if (sectionAnalysis.addressed && sectionAnalysis.confidence >= 0.7) {
      continue;
    }

    questions.push({
      section,
      question: generateQuestion(section, sectionAnalysis),
      weight: meta.weight,
      required: meta.required,
    });
  }

  // Sort: required first, then by weight descending
  questions.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return b.weight - a.weight;
  });

  return questions;
}

/**
 * Run gap analysis against the LLM.
 * Max 2 calls: primary + retry on malformed JSON.
 * Falls back to all-pending if both fail.
 */
export async function analyzeGaps(rawIdea: string): Promise<GapAnalysisResult> {
  const client = new Anthropic();

  // --- Primary attempt ---
  const primaryResponse = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: 'You are a product analysis assistant. You analyze product ideas and return structured JSON. Never invent information the user did not provide.',
    messages: [{ role: 'user', content: buildPrimaryPrompt(rawIdea) }],
  });

  const primaryText =
    primaryResponse.content[0].type === 'text'
      ? primaryResponse.content[0].text
      : '';

  const primaryParsed = parseGapAnalysisJson(primaryText);
  if (primaryParsed) {
    return {
      sections: primaryParsed,
      prioritizedQuestions: prioritizeQuestions(primaryParsed),
      retried: false,
      fellBackToDefault: false,
    };
  }

  // --- Retry with simplified prompt ---
  const retryResponse = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: 'Return ONLY valid JSON. No other text.',
    messages: [{ role: 'user', content: buildRetryPrompt(rawIdea) }],
  });

  const retryText =
    retryResponse.content[0].type === 'text'
      ? retryResponse.content[0].text
      : '';

  const retryParsed = parseGapAnalysisJson(retryText);
  if (retryParsed) {
    return {
      sections: retryParsed,
      prioritizedQuestions: prioritizeQuestions(retryParsed),
      retried: true,
      fellBackToDefault: false,
    };
  }

  // --- Fallback: all pending ---
  const fallback = allPendingAnalysis();
  return {
    sections: fallback,
    prioritizedQuestions: prioritizeQuestions(fallback),
    retried: true,
    fellBackToDefault: true,
  };
}
