import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSession, loadSession, clearSession, isLocalStorageAvailable } from '@/lib/utils/storage';
import type { PRDSession } from '@/lib/types/session';
import { ALL_SECTIONS } from '@/lib/constants/checklist';

// Mock localStorage for Node test environment
const store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
};

vi.stubGlobal('window', { localStorage: localStorageMock });

function createTestSession(): PRDSession {
  const sections = Object.fromEntries(
    ALL_SECTIONS.map((s) => [
      s,
      { status: 'pending' as const, completedAt: null, data: {} },
    ]),
  ) as PRDSession['checklist']['sections'];

  return {
    id: 'test-uuid-1234',
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z',
    status: 'interviewing',
    userInput: { rawIdea: 'A todo app', attachments: [] },
    checklist: { sections, completionPercentage: 0 },
    conversation: [],
    prd: null,
    qualityScore: null,
    exportHistory: [],
  };
}

describe('storage utilities', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    vi.clearAllMocks();
  });

  it('saves and loads a session round-trip', () => {
    const session = createTestSession();
    saveSession(session);
    const loaded = loadSession();
    expect(loaded).toEqual(session);
  });

  it('returns null when no session is saved', () => {
    expect(loadSession()).toBeNull();
  });

  it('clears a saved session', () => {
    const session = createTestSession();
    saveSession(session);
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it('preserves all session fields through serialization', () => {
    const session = createTestSession();
    session.conversation = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'I want a todo app',
        timestamp: '2026-02-20T00:01:00.000Z',
        relatedSection: null,
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Tell me about your target users.',
        timestamp: '2026-02-20T00:01:05.000Z',
        relatedSection: 'personas',
      },
    ];
    session.checklist.sections.personas.status = 'complete';
    session.checklist.sections.personas.completedAt = '2026-02-20T00:02:00.000Z';
    session.checklist.completionPercentage = 15;

    saveSession(session);
    const loaded = loadSession();
    expect(loaded).toEqual(session);
    expect(loaded!.conversation).toHaveLength(2);
    expect(loaded!.checklist.sections.personas.status).toBe('complete');
  });

  it('detects localStorage availability', () => {
    expect(isLocalStorageAvailable()).toBe(true);
  });
});
