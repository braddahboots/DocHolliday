/**
 * Weighted completion percentage calculator.
 *
 * Rules from PRD.md §Phase 1:
 * - Required sections that are skipped count as 0% toward their weight
 * - Optional sections that are skipped still count their full weight
 * - Overall completion = sum of (weight * (1 if complete, 0 if pending/skipped-required))
 */

import { CHECKLIST_SECTIONS } from '@/lib/constants/checklist';
import type { ChecklistState, ChecklistSection } from '@/lib/types/session';

export function calculateCompletionPercentage(
  sections: ChecklistState['sections'],
): number {
  let total = 0;

  for (const [key, meta] of Object.entries(CHECKLIST_SECTIONS)) {
    const section = sections[key as ChecklistSection];
    if (section.status === 'complete') {
      total += meta.weight;
    } else if (section.status === 'skipped' && !meta.required) {
      total += meta.weight;
    }
    // pending or skipped-required = 0 contribution
  }

  return Math.round(total * 100);
}
