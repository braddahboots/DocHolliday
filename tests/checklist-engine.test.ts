import { describe, it, expect } from 'vitest';
import { parseGapAnalysisJson, prioritizeQuestions } from '@/lib/engine/checklist-engine';
import type { GapAnalysisRaw, SectionAnalysis } from '@/lib/types/gap-analysis';
import { ALL_SECTIONS } from '@/lib/constants/checklist';
import type { ChecklistSection } from '@/lib/types/session';

// --- Helpers ---

function makeSection(overrides: Partial<SectionAnalysis> = {}): SectionAnalysis {
  return {
    addressed: false,
    confidence: 0,
    extractedData: {},
    gaps: ['Not addressed'],
    ...overrides,
  };
}

function makeFullAnalysis(
  overrides: Partial<Record<ChecklistSection, Partial<SectionAnalysis>>> = {},
): GapAnalysisRaw {
  return Object.fromEntries(
    ALL_SECTIONS.map((s) => [s, makeSection(overrides[s])]),
  ) as GapAnalysisRaw;
}

function toJson(analysis: GapAnalysisRaw): string {
  return JSON.stringify(analysis);
}

// --- parseGapAnalysisJson ---

describe('parseGapAnalysisJson', () => {
  it('parses valid JSON with all 9 sections', () => {
    const raw = makeFullAnalysis();
    const result = parseGapAnalysisJson(toJson(raw));
    expect(result).toEqual(raw);
  });

  it('strips markdown code fences', () => {
    const raw = makeFullAnalysis();
    const wrapped = '```json\n' + toJson(raw) + '\n```';
    const result = parseGapAnalysisJson(wrapped);
    expect(result).toEqual(raw);
  });

  it('returns null for invalid JSON', () => {
    expect(parseGapAnalysisJson('not json at all')).toBeNull();
  });

  it('returns null for JSON missing a section', () => {
    const raw = makeFullAnalysis();
    const partial = { ...raw };
    delete (partial as Record<string, unknown>)['personas'];
    expect(parseGapAnalysisJson(JSON.stringify(partial))).toBeNull();
  });

  it('returns null when addressed is not boolean', () => {
    const raw = makeFullAnalysis();
    (raw.personas as unknown as Record<string, unknown>).addressed = 'yes';
    expect(parseGapAnalysisJson(JSON.stringify(raw))).toBeNull();
  });

  it('returns null when confidence is out of range', () => {
    const raw = makeFullAnalysis();
    raw.personas.confidence = 1.5;
    expect(parseGapAnalysisJson(JSON.stringify(raw))).toBeNull();
  });

  it('returns null when gaps is not an array', () => {
    const raw = makeFullAnalysis();
    (raw.personas as unknown as Record<string, unknown>).gaps = 'missing';
    expect(parseGapAnalysisJson(JSON.stringify(raw))).toBeNull();
  });

  it('handles empty string', () => {
    expect(parseGapAnalysisJson('')).toBeNull();
  });

  it('accepts confidence = 0 and confidence = 1 as valid', () => {
    const raw = makeFullAnalysis({
      personas: { confidence: 0 },
      user_stories: { confidence: 1 },
    });
    expect(parseGapAnalysisJson(toJson(raw))).toEqual(raw);
  });
});

// --- prioritizeQuestions ---

describe('prioritizeQuestions', () => {
  it('returns questions for all unaddressed sections', () => {
    const analysis = makeFullAnalysis(); // all unaddressed
    const questions = prioritizeQuestions(analysis);
    expect(questions).toHaveLength(9);
  });

  it('skips sections with addressed=true and confidence >= 0.7', () => {
    const analysis = makeFullAnalysis({
      problem_evidence: { addressed: true, confidence: 0.8 },
      personas: { addressed: true, confidence: 0.9 },
    });
    const questions = prioritizeQuestions(analysis);
    const sections = questions.map((q) => q.section);
    expect(sections).not.toContain('problem_evidence');
    expect(sections).not.toContain('personas');
    expect(questions).toHaveLength(7);
  });

  it('includes sections with addressed=true but confidence < 0.7', () => {
    const analysis = makeFullAnalysis({
      personas: { addressed: true, confidence: 0.5 },
    });
    const questions = prioritizeQuestions(analysis);
    const sections = questions.map((q) => q.section);
    expect(sections).toContain('personas');
  });

  it('puts required sections before optional sections', () => {
    const analysis = makeFullAnalysis(); // all unaddressed
    const questions = prioritizeQuestions(analysis);

    // Find the index of the first optional section
    const firstOptionalIdx = questions.findIndex((q) => !q.required);
    // Find the index of the last required section
    const lastRequiredIdx = questions.length - 1 - [...questions].reverse().findIndex((q) => q.required);

    if (firstOptionalIdx !== -1 && lastRequiredIdx !== -1) {
      expect(firstOptionalIdx).toBeGreaterThan(lastRequiredIdx);
    }
  });

  it('sorts by weight descending within same priority tier', () => {
    const analysis = makeFullAnalysis(); // all unaddressed
    const questions = prioritizeQuestions(analysis);

    const required = questions.filter((q) => q.required);
    const optional = questions.filter((q) => !q.required);

    for (let i = 1; i < required.length; i++) {
      expect(required[i].weight).toBeLessThanOrEqual(required[i - 1].weight);
    }
    for (let i = 1; i < optional.length; i++) {
      expect(optional[i].weight).toBeLessThanOrEqual(optional[i - 1].weight);
    }
  });

  it('returns empty array when all sections are fully addressed', () => {
    const analysis = makeFullAnalysis(
      Object.fromEntries(
        ALL_SECTIONS.map((s) => [s, { addressed: true, confidence: 0.9 }]),
      ) as Record<ChecklistSection, Partial<SectionAnalysis>>,
    );
    const questions = prioritizeQuestions(analysis);
    expect(questions).toHaveLength(0);
  });

  it('acceptance: 5 unaddressed sections → required before optional, higher weight first', () => {
    // PRD acceptance criteria #3
    const analysis = makeFullAnalysis({
      problem_evidence: { addressed: true, confidence: 0.9 }, // complete, skip
      personas: { addressed: true, confidence: 0.8 },         // complete, skip
      user_stories: { addressed: true, confidence: 0.7 },     // complete, skip
      features_prioritized: { addressed: true, confidence: 0.75 }, // complete, skip
      // 5 remaining are unaddressed:
      // Required: tech_constraints (0.10), anti_requirements (0.10), success_metrics (0.10)
      // Optional: risks_dependencies (0.05), validation_scenarios (0.05)
    });
    const questions = prioritizeQuestions(analysis);
    expect(questions).toHaveLength(5);

    // First 3 should be required
    expect(questions[0].required).toBe(true);
    expect(questions[1].required).toBe(true);
    expect(questions[2].required).toBe(true);

    // Last 2 should be optional
    expect(questions[3].required).toBe(false);
    expect(questions[4].required).toBe(false);
  });
});
