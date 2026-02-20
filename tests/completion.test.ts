import { describe, it, expect } from 'vitest';
import { calculateCompletionPercentage } from '@/lib/utils/completion';
import { ALL_SECTIONS } from '@/lib/constants/checklist';
import type { ChecklistState, ChecklistSection } from '@/lib/types/session';

function makeSections(
  overrides: Partial<Record<ChecklistSection, 'pending' | 'complete' | 'skipped'>> = {},
): ChecklistState['sections'] {
  return Object.fromEntries(
    ALL_SECTIONS.map((s) => [
      s,
      {
        status: overrides[s] ?? 'pending',
        completedAt: overrides[s] === 'complete' ? new Date().toISOString() : null,
        data: {},
      },
    ]),
  ) as ChecklistState['sections'];
}

describe('calculateCompletionPercentage', () => {
  it('returns 0 for all-pending sections', () => {
    const sections = makeSections();
    expect(calculateCompletionPercentage(sections)).toBe(0);
  });

  it('returns 100 for all-complete sections', () => {
    const overrides = Object.fromEntries(
      ALL_SECTIONS.map((s) => [s, 'complete' as const]),
    ) as Record<ChecklistSection, 'complete'>;
    const sections = makeSections(overrides);
    expect(calculateCompletionPercentage(sections)).toBe(100);
  });

  it('calculates weighted percentage for mixed states', () => {
    // Complete: problem_evidence (15%) + personas (15%) + user_stories (15%) = 45%
    const sections = makeSections({
      problem_evidence: 'complete',
      personas: 'complete',
      user_stories: 'complete',
    });
    expect(calculateCompletionPercentage(sections)).toBe(45);
  });

  it('skipped required sections count as 0', () => {
    // Skip a required section (problem_evidence, 15%) — should not contribute
    const sections = makeSections({
      problem_evidence: 'skipped',
      personas: 'complete',
    });
    // Only personas (15%) counts
    expect(calculateCompletionPercentage(sections)).toBe(15);
  });

  it('skipped optional sections count their full weight', () => {
    // risks_dependencies is optional (5%), validation_scenarios is optional (5%)
    const sections = makeSections({
      risks_dependencies: 'skipped',
      validation_scenarios: 'skipped',
    });
    // Both optional skipped = 5% + 5% = 10%
    expect(calculateCompletionPercentage(sections)).toBe(10);
  });

  it('matches PRD acceptance criteria: 3 required complete + 1 skipped', () => {
    // "Given a user completes 3 required sections and skips 1, when completionPercentage
    // is calculated, then it equals the sum of completed section weights"
    const sections = makeSections({
      problem_evidence: 'complete',    // 15%
      personas: 'complete',            // 15%
      user_stories: 'complete',        // 15%
      features_prioritized: 'skipped', // 15% — required, skipped = 0
    });
    // 15 + 15 + 15 = 45%
    expect(calculateCompletionPercentage(sections)).toBe(45);
  });
});
