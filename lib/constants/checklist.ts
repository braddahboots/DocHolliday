/**
 * Checklist section metadata: weights, required status, display labels.
 * Weights and rules defined in PRD.md §Phase 1.
 */

import type { ChecklistSection } from '@/lib/types/session';

export interface SectionMeta {
  weight: number;
  required: boolean;
  label: string;
}

export const CHECKLIST_SECTIONS: Record<ChecklistSection, SectionMeta> = {
  problem_evidence:     { weight: 0.15, required: true,  label: 'Problem & Evidence' },
  personas:             { weight: 0.15, required: true,  label: 'User Personas' },
  user_stories:         { weight: 0.15, required: true,  label: 'User Stories' },
  features_prioritized: { weight: 0.15, required: true,  label: 'Prioritized Features' },
  tech_constraints:     { weight: 0.10, required: true,  label: 'Tech Constraints' },
  anti_requirements:    { weight: 0.10, required: true,  label: 'Anti-Requirements' },
  success_metrics:      { weight: 0.10, required: true,  label: 'Success Metrics' },
  risks_dependencies:   { weight: 0.05, required: false, label: 'Risks & Dependencies' },
  validation_scenarios: { weight: 0.05, required: false, label: 'Validation Scenarios' },
} as const;

export const ALL_SECTIONS = Object.keys(CHECKLIST_SECTIONS) as ChecklistSection[];

export const REQUIRED_SECTIONS = ALL_SECTIONS.filter(
  (s) => CHECKLIST_SECTIONS[s].required,
);

export const OPTIONAL_SECTIONS = ALL_SECTIONS.filter(
  (s) => !CHECKLIST_SECTIONS[s].required,
);
