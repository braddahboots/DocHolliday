/**
 * Unit tests for the conversation engine (Phase 3).
 * Tests mock response logic, smart defaults, and conversation turn processing.
 */

import { describe, it, expect } from 'vitest';
import {
  processConversationTurn,
  getSmartDefault,
} from '@/lib/engine/conversation-engine';
import type { ConversationTurnRequest } from '@/lib/types/conversation';
import { ALL_SECTIONS } from '@/lib/constants/checklist';
import type { ChecklistSection } from '@/lib/types/session';

// --- Smart Defaults ---

describe('getSmartDefault', () => {
  it('returns a smart default for personas', () => {
    const result = getSmartDefault('personas', 'I want to build a habit tracker app');
    expect(result).not.toBeNull();
    expect(result!.section).toBe('personas');
    expect(result!.summary).toBe('2 inferred personas');
    expect(result!.content).toContain('Persona 1');
    expect(result!.content).toContain('Persona 2');
  });

  it('returns a smart default for tech_constraints', () => {
    const result = getSmartDefault('tech_constraints', 'a todo app');
    expect(result).not.toBeNull();
    expect(result!.section).toBe('tech_constraints');
    expect(result!.content).toContain('React');
    expect(result!.content).toContain('Tailwind');
  });

  it('returns a smart default for anti_requirements', () => {
    const result = getSmartDefault('anti_requirements', 'a recipe sharing app');
    expect(result).not.toBeNull();
    expect(result!.section).toBe('anti_requirements');
    expect(result!.content).toContain('Must NOT');
    expect(result!.summary).toBe('4 auto-generated constraints');
  });

  it('returns a smart default for success_metrics', () => {
    const result = getSmartDefault('success_metrics', 'a fitness app');
    expect(result).not.toBeNull();
    expect(result!.section).toBe('success_metrics');
    expect(result!.content).toContain('KPI');
    expect(result!.summary).toBe('3 suggested KPIs');
  });

  it('returns null for sections without smart defaults', () => {
    const noDefaultSections: ChecklistSection[] = [
      'problem_evidence',
      'user_stories',
      'features_prioritized',
      'risks_dependencies',
      'validation_scenarios',
    ];

    for (const section of noDefaultSections) {
      expect(getSmartDefault(section, 'some idea')).toBeNull();
    }
  });

  it('adapts persona content based on app type keywords', () => {
    const fitness = getSmartDefault('personas', 'a fitness tracker');
    const finance = getSmartDefault('personas', 'a budgeting app');

    expect(fitness!.content).toContain('fitness');
    expect(finance!.content).toContain('budgeting');
  });
});

// --- processConversationTurn ---

describe('processConversationTurn', () => {
  const baseRequest: ConversationTurnRequest = {
    rawIdea: 'I want to build a habit tracker app',
    userMessage: 'It helps people build daily habits through streaks and reminders.',
    currentSection: 'problem_evidence',
    action: 'answer',
  };

  it('returns an acknowledgment for an answer action', async () => {
    const result = await processConversationTurn(baseRequest);
    expect(result.assistantMessage).toBeTruthy();
    expect(result.extractedData).toHaveProperty('user_response');
    expect(result.extractedData.user_response).toBe(baseRequest.userMessage);
  });

  it('returns a skip message for a skip action', async () => {
    const result = await processConversationTurn({
      ...baseRequest,
      action: 'skip',
      userMessage: '',
    });
    expect(result.assistantMessage).toContain('skip');
    expect(result.extractedData).toEqual({});
  });

  it('returns acknowledgment with defaults for approve_default action', async () => {
    const result = await processConversationTurn({
      ...baseRequest,
      currentSection: 'personas',
      action: 'approve_default',
    });
    expect(result.assistantMessage).toContain('defaults');
    expect(result.extractedData).toHaveProperty('approved_default', true);
    expect(result.extractedData).toHaveProperty('content');
  });

  it('provides section-specific acknowledgments', async () => {
    for (const section of ALL_SECTIONS) {
      const result = await processConversationTurn({
        ...baseRequest,
        currentSection: section,
        action: 'answer',
      });
      // Each section should get a non-empty acknowledgment
      expect(result.assistantMessage.length).toBeGreaterThan(0);
    }
  });

  it('provides section-specific skip messages', async () => {
    for (const section of ALL_SECTIONS) {
      const result = await processConversationTurn({
        ...baseRequest,
        currentSection: section,
        action: 'skip',
        userMessage: '',
      });
      expect(result.assistantMessage.length).toBeGreaterThan(0);
    }
  });
});
