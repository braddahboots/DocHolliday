/**
 * Types for the Checklist Engine + Gap Detection (Phase 2).
 * Schema defined in PRD.md §Phase 2.
 */

import type { ChecklistSection } from './session';

/** Per-section result returned by the LLM gap analysis. */
export interface SectionAnalysis {
  addressed: boolean;
  confidence: number;
  extractedData: Record<string, unknown>;
  gaps: string[];
}

/** Full LLM response: one SectionAnalysis per checklist section. */
export type GapAnalysisRaw = Record<ChecklistSection, SectionAnalysis>;

/** A prioritized question for a section that needs more info. */
export interface PrioritizedQuestion {
  section: ChecklistSection;
  question: string;
  weight: number;
  required: boolean;
}

/** The complete result of a gap detection run. */
export interface GapAnalysisResult {
  sections: GapAnalysisRaw;
  prioritizedQuestions: PrioritizedQuestion[];
  retried: boolean;
  fellBackToDefault: boolean;
}
