import { describe, it, expect } from 'vitest';
import { parsePRDJson, buildMockPRD } from '@/lib/engine/prd-generation-engine';
import { buildChecklistContext, buildPRDGenerationPrompt, buildPRDRetryPrompt } from '@/lib/engine/prd-prompts';
import type { ChecklistSection, ChecklistSectionState } from '@/lib/types/session';
import { ALL_SECTIONS } from '@/lib/constants/checklist';

// --- Helpers ---

const PRD_KEYS = [
  'overview', 'personas', 'userStories', 'features', 'antiRequirements',
  'techRequirements', 'implementationPhases', 'successMetrics', 'risks',
  'outOfScope', 'validationHarness',
] as const;

function makeSection(
  status: 'pending' | 'complete' | 'skipped' = 'pending',
  data: Record<string, unknown> = {},
): ChecklistSectionState {
  return {
    status,
    completedAt: status === 'complete' ? new Date().toISOString() : null,
    data,
  };
}

function makeSections(
  overrides: Partial<Record<ChecklistSection, ChecklistSectionState>> = {},
): Record<ChecklistSection, ChecklistSectionState> {
  return Object.fromEntries(
    ALL_SECTIONS.map((s) => [s, overrides[s] ?? makeSection()]),
  ) as Record<ChecklistSection, ChecklistSectionState>;
}

function makeValidPRDJson(): string {
  const obj: Record<string, string> = {};
  for (const key of PRD_KEYS) {
    obj[key] = `Content for ${key}`;
  }
  return JSON.stringify(obj);
}

// --- parsePRDJson ---

describe('parsePRDJson', () => {
  it('parses valid JSON with all 11 keys', () => {
    const result = parsePRDJson(makeValidPRDJson());
    expect(result).not.toBeNull();
    for (const key of PRD_KEYS) {
      expect(result![key]).toBe(`Content for ${key}`);
    }
  });

  it('strips markdown code fences', () => {
    const wrapped = '```json\n' + makeValidPRDJson() + '\n```';
    const result = parsePRDJson(wrapped);
    expect(result).not.toBeNull();
    expect(result!.overview).toBe('Content for overview');
  });

  it('strips code fences without language tag', () => {
    const wrapped = '```\n' + makeValidPRDJson() + '\n```';
    const result = parsePRDJson(wrapped);
    expect(result).not.toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parsePRDJson('not json')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parsePRDJson('')).toBeNull();
  });

  it('returns null when a key is missing', () => {
    const obj: Record<string, string> = {};
    for (const key of PRD_KEYS) {
      obj[key] = `Content for ${key}`;
    }
    delete obj.validationHarness;
    expect(parsePRDJson(JSON.stringify(obj))).toBeNull();
  });

  it('returns null when a value is not a string', () => {
    const obj: Record<string, unknown> = {};
    for (const key of PRD_KEYS) {
      obj[key] = `Content for ${key}`;
    }
    obj.overview = 42;
    expect(parsePRDJson(JSON.stringify(obj))).toBeNull();
  });

  it('returns null for array input', () => {
    expect(parsePRDJson('[]')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parsePRDJson('null')).toBeNull();
  });

  it('accepts empty strings as valid section content', () => {
    const obj: Record<string, string> = {};
    for (const key of PRD_KEYS) {
      obj[key] = '';
    }
    expect(parsePRDJson(JSON.stringify(obj))).not.toBeNull();
  });
});

// --- buildMockPRD ---

describe('buildMockPRD', () => {
  it('returns a GeneratedPRD with all 11 sections', () => {
    const sections = makeSections();
    const prd = buildMockPRD('A todo app', sections);

    expect(prd.version).toBe(1);
    expect(prd.generatedAt).toBeTruthy();
    for (const key of PRD_KEYS) {
      expect(typeof prd.sections[key]).toBe('string');
      expect(prd.sections[key].length).toBeGreaterThan(0);
    }
  });

  it('includes raw idea in overview', () => {
    const sections = makeSections();
    const prd = buildMockPRD('A recipe sharing platform', sections);
    expect(prd.sections.overview).toContain('A recipe sharing platform');
  });

  it('marks skipped sections with SKIPPED marker', () => {
    const sections = makeSections({
      personas: makeSection('skipped'),
      user_stories: makeSection('skipped'),
    });
    const prd = buildMockPRD('Test app', sections);

    expect(prd.sections.personas).toBe('[SKIPPED -- not specified by user]');
    expect(prd.sections.userStories).toBe('[SKIPPED -- not specified by user]');
  });

  it('auto-generates antiRequirements even when section is skipped', () => {
    const sections = makeSections({
      anti_requirements: makeSection('skipped'),
    });
    const prd = buildMockPRD('Test app', sections);

    expect(prd.sections.antiRequirements).not.toBe('[SKIPPED -- not specified by user]');
    expect(prd.sections.antiRequirements).toContain('Must NOT');
  });

  it('always generates implementationPhases', () => {
    const sections = makeSections();
    const prd = buildMockPRD('Test app', sections);

    expect(prd.sections.implementationPhases).toContain('Phase 1');
    expect(prd.sections.implementationPhases).toContain('Phase 2');
  });

  it('always generates validationHarness', () => {
    const sections = makeSections();
    const prd = buildMockPRD('Test app', sections);

    expect(prd.sections.validationHarness).toContain('Scenario 1');
    expect(prd.sections.validationHarness).toContain('Scenario 2');
  });

  it('uses user_response data when available', () => {
    const sections = makeSections({
      personas: makeSection('complete', { user_response: 'Tech-savvy millennials who love cooking' }),
    });
    const prd = buildMockPRD('Test app', sections);

    expect(prd.sections.personas).toContain('Tech-savvy millennials who love cooking');
  });

  it('uses approved default content when available', () => {
    const sections = makeSections({
      success_metrics: makeSection('complete', {
        approved_default: true,
        content: 'Retention >= 40%, Task completion >= 80%',
      }),
    });
    const prd = buildMockPRD('Test app', sections);

    expect(prd.sections.successMetrics).toContain('Retention >= 40%');
  });
});

// --- buildChecklistContext ---

describe('buildChecklistContext', () => {
  it('labels complete sections with user data', () => {
    const sections = makeSections({
      problem_evidence: makeSection('complete', { user_response: 'Users need better task management' }),
    });
    const context = buildChecklistContext(sections);

    expect(context).toContain('COMPLETE');
    expect(context).toContain('Users need better task management');
  });

  it('labels skipped sections as SKIPPED', () => {
    const sections = makeSections({
      personas: makeSection('skipped'),
    });
    const context = buildChecklistContext(sections);

    expect(context).toContain('SKIPPED by user');
  });

  it('labels pending sections as NOT ADDRESSED', () => {
    const sections = makeSections();
    const context = buildChecklistContext(sections);

    expect(context).toContain('NOT ADDRESSED');
  });

  it('includes all 9 sections', () => {
    const sections = makeSections();
    const context = buildChecklistContext(sections);

    expect(context).toContain('Overview & Problem Statement');
    expect(context).toContain('User Personas');
    expect(context).toContain('User Stories');
    expect(context).toContain('Prioritized Features');
    expect(context).toContain('Anti-Requirements');
    expect(context).toContain('Technical & Non-Functional Requirements');
    expect(context).toContain('Success Metrics');
    expect(context).toContain('Risks, Dependencies');
    expect(context).toContain('Validation Harness');
  });
});

// --- Prompt builders ---

describe('buildPRDGenerationPrompt', () => {
  it('includes the raw idea', () => {
    const prompt = buildPRDGenerationPrompt('A habit tracker', 'some context');
    expect(prompt).toContain('A habit tracker');
  });

  it('includes the checklist context', () => {
    const prompt = buildPRDGenerationPrompt('idea', 'CHECKLIST_DATA_HERE');
    expect(prompt).toContain('CHECKLIST_DATA_HERE');
  });

  it('specifies all 11 section keys', () => {
    const prompt = buildPRDGenerationPrompt('idea', 'ctx');
    for (const key of PRD_KEYS) {
      expect(prompt).toContain(`"${key}"`);
    }
  });

  it('includes the SKIPPED marker instruction', () => {
    const prompt = buildPRDGenerationPrompt('idea', 'ctx');
    expect(prompt).toContain('[SKIPPED -- not specified by user]');
  });

  it('includes the 3000-word limit', () => {
    const prompt = buildPRDGenerationPrompt('idea', 'ctx');
    expect(prompt).toContain('3000 words');
  });
});

describe('buildPRDRetryPrompt', () => {
  it('includes the raw idea', () => {
    const prompt = buildPRDRetryPrompt('A chat app', 'ctx');
    expect(prompt).toContain('A chat app');
  });

  it('specifies all 11 keys', () => {
    const prompt = buildPRDRetryPrompt('idea', 'ctx');
    for (const key of PRD_KEYS) {
      expect(prompt).toContain(key);
    }
  });

  it('instructs to return valid JSON only', () => {
    const prompt = buildPRDRetryPrompt('idea', 'ctx');
    expect(prompt).toContain('valid JSON only');
  });
});
