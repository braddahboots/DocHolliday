/**
 * Tests for the session reducer logic.
 * We import the reducer indirectly by testing the exported functions' behavior.
 * Since the reducer is not exported directly, we test via dispatch simulation.
 */

import { describe, it, expect, vi } from 'vitest';
import { ALL_SECTIONS } from '@/lib/constants/checklist';
import { calculateCompletionPercentage } from '@/lib/utils/completion';
import type {
  PRDSession,
  ChecklistSection,
  SessionStatus,
} from '@/lib/types/session';

// Re-create the reducer logic inline for unit testing (mirrors session-context.tsx)
// This avoids importing React hooks in a Node test environment.

function generateId(): string {
  return crypto.randomUUID();
}

function createEmptySession(): PRDSession {
  const now = new Date().toISOString();
  const sections = Object.fromEntries(
    ALL_SECTIONS.map((s) => [
      s,
      { status: 'pending' as const, completedAt: null, data: {} },
    ]),
  ) as PRDSession['checklist']['sections'];

  return {
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    status: 'interviewing',
    userInput: { rawIdea: '', attachments: [] },
    checklist: { sections, completionPercentage: 0 },
    conversation: [],
    prd: null,
    qualityScore: null,
    exportHistory: [],
  };
}

type SessionAction =
  | { type: 'RESTORE_SESSION'; session: PRDSession }
  | { type: 'SET_RAW_IDEA'; rawIdea: string }
  | { type: 'SET_STATUS'; status: SessionStatus }
  | { type: 'UPDATE_SECTION'; section: ChecklistSection; status: 'pending' | 'complete' | 'skipped'; data?: Record<string, unknown> }
  | { type: 'ADD_MESSAGE'; message: { role: 'user' | 'assistant'; content: string; relatedSection: ChecklistSection | null } }
  | { type: 'RESET_SESSION' };

function sessionReducer(state: PRDSession, action: SessionAction): PRDSession {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'RESTORE_SESSION':
      return action.session;

    case 'SET_RAW_IDEA':
      return {
        ...state,
        updatedAt: now,
        userInput: { ...state.userInput, rawIdea: action.rawIdea },
      };

    case 'SET_STATUS':
      return { ...state, updatedAt: now, status: action.status };

    case 'UPDATE_SECTION': {
      const updatedSections = {
        ...state.checklist.sections,
        [action.section]: {
          status: action.status,
          completedAt: action.status === 'complete' ? now : null,
          data: action.data ?? state.checklist.sections[action.section].data,
        },
      };
      return {
        ...state,
        updatedAt: now,
        checklist: {
          sections: updatedSections,
          completionPercentage: calculateCompletionPercentage(updatedSections),
        },
      };
    }

    case 'ADD_MESSAGE':
      return {
        ...state,
        updatedAt: now,
        conversation: [
          ...state.conversation,
          {
            ...action.message,
            id: generateId(),
            timestamp: now,
          },
        ],
      };

    case 'RESET_SESSION':
      return createEmptySession();

    default:
      return state;
  }
}

// Mock crypto.randomUUID for deterministic tests
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-0000' });

describe('sessionReducer', () => {
  it('creates empty session with all sections pending', () => {
    const session = createEmptySession();
    expect(session.status).toBe('interviewing');
    expect(session.checklist.completionPercentage).toBe(0);
    expect(session.conversation).toHaveLength(0);
    for (const s of ALL_SECTIONS) {
      expect(session.checklist.sections[s].status).toBe('pending');
    }
  });

  it('SET_RAW_IDEA updates rawIdea and produces new state', () => {
    const state = createEmptySession();
    const next = sessionReducer(state, { type: 'SET_RAW_IDEA', rawIdea: 'A recipe app' });
    expect(next.userInput.rawIdea).toBe('A recipe app');
    expect(next.updatedAt).toBeTruthy();
    expect(next).not.toBe(state);
  });

  it('SET_STATUS transitions session status', () => {
    const state = createEmptySession();
    const next = sessionReducer(state, { type: 'SET_STATUS', status: 'generating' });
    expect(next.status).toBe('generating');
  });

  it('UPDATE_SECTION marks a section complete and recalculates percentage', () => {
    const state = createEmptySession();
    const next = sessionReducer(state, {
      type: 'UPDATE_SECTION',
      section: 'problem_evidence',
      status: 'complete',
      data: { problem: 'Users cannot find recipes' },
    });
    expect(next.checklist.sections.problem_evidence.status).toBe('complete');
    expect(next.checklist.sections.problem_evidence.completedAt).toBeTruthy();
    expect(next.checklist.sections.problem_evidence.data).toEqual({ problem: 'Users cannot find recipes' });
    expect(next.checklist.completionPercentage).toBe(15); // problem_evidence = 15%
  });

  it('ADD_MESSAGE appends with generated id and timestamp', () => {
    const state = createEmptySession();
    const next = sessionReducer(state, {
      type: 'ADD_MESSAGE',
      message: { role: 'user', content: 'I want a recipe app', relatedSection: null },
    });
    expect(next.conversation).toHaveLength(1);
    expect(next.conversation[0].role).toBe('user');
    expect(next.conversation[0].content).toBe('I want a recipe app');
    expect(next.conversation[0].id).toBe('test-uuid-0000');
    expect(next.conversation[0].timestamp).toBeTruthy();
  });

  it('ADD_MESSAGE correctly maps relatedSection', () => {
    const state = createEmptySession();
    const next = sessionReducer(state, {
      type: 'ADD_MESSAGE',
      message: { role: 'assistant', content: 'Who are your target users?', relatedSection: 'personas' },
    });
    expect(next.conversation[0].relatedSection).toBe('personas');
  });

  it('RESTORE_SESSION replaces entire state', () => {
    const state = createEmptySession();
    const saved = createEmptySession();
    saved.userInput.rawIdea = 'A fitness tracker';
    saved.status = 'scoring';
    const next = sessionReducer(state, { type: 'RESTORE_SESSION', session: saved });
    expect(next).toBe(saved);
  });

  it('RESET_SESSION returns a fresh empty session', () => {
    const state = createEmptySession();
    state.userInput.rawIdea = 'old idea';
    state.status = 'complete';
    const next = sessionReducer(state, { type: 'RESET_SESSION' });
    expect(next.userInput.rawIdea).toBe('');
    expect(next.status).toBe('interviewing');
    expect(next.id).toBe('test-uuid-0000');
  });
});
