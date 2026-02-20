'use client';

/**
 * Session state management via React Context + useReducer.
 * PRD.md §Phase 1: all session state lives here, auto-saved to localStorage.
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type {
  PRDSession,
  ChecklistSection,
  ChecklistSectionStatus,
  ConversationMessage,
  SessionStatus,
  GeneratedPRD,
  QualityScore,
  ExportRecord,
} from '@/lib/types/session';
import { ALL_SECTIONS } from '@/lib/constants/checklist';
import { calculateCompletionPercentage } from '@/lib/utils/completion';
import { saveSession, loadSession, clearSession } from '@/lib/utils/storage';

// --- Actions ---

type SessionAction =
  | { type: 'INIT'; savedSession: PRDSession | null }
  | { type: 'RESUME_SESSION' }
  | { type: 'RESTORE_SESSION'; session: PRDSession }
  | { type: 'SET_RAW_IDEA'; rawIdea: string }
  | { type: 'SET_STATUS'; status: SessionStatus }
  | {
      type: 'UPDATE_SECTION';
      section: ChecklistSection;
      status: ChecklistSectionStatus;
      data?: Record<string, unknown>;
    }
  | { type: 'ADD_MESSAGE'; message: Omit<ConversationMessage, 'id' | 'timestamp'> }
  | { type: 'SET_PRD'; prd: GeneratedPRD }
  | { type: 'SET_QUALITY_SCORE'; score: QualityScore }
  | { type: 'ADD_EXPORT'; record: ExportRecord }
  | { type: 'RESET_SESSION' };

// --- Combined state (session + recovery metadata) ---

interface SessionState {
  session: PRDSession;
  pendingSavedSession: PRDSession | null;
  initialized: boolean;
}

// --- Helpers ---

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

function createInitialState(): SessionState {
  return {
    session: createEmptySession(),
    pendingSavedSession: null,
    initialized: false,
  };
}

// --- Reducer ---

function updateSession(session: PRDSession, action: SessionAction): PRDSession {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'RESTORE_SESSION':
      return action.session;

    case 'SET_RAW_IDEA':
      return {
        ...session,
        updatedAt: now,
        userInput: { ...session.userInput, rawIdea: action.rawIdea },
      };

    case 'SET_STATUS':
      return { ...session, updatedAt: now, status: action.status };

    case 'UPDATE_SECTION': {
      const updatedSections = {
        ...session.checklist.sections,
        [action.section]: {
          status: action.status,
          completedAt: action.status === 'complete' ? now : null,
          data: action.data ?? session.checklist.sections[action.section].data,
        },
      };
      return {
        ...session,
        updatedAt: now,
        checklist: {
          sections: updatedSections,
          completionPercentage: calculateCompletionPercentage(updatedSections),
        },
      };
    }

    case 'ADD_MESSAGE':
      return {
        ...session,
        updatedAt: now,
        conversation: [
          ...session.conversation,
          {
            ...action.message,
            id: generateId(),
            timestamp: now,
          },
        ],
      };

    case 'SET_PRD':
      return { ...session, updatedAt: now, prd: action.prd };

    case 'SET_QUALITY_SCORE':
      return { ...session, updatedAt: now, qualityScore: action.score };

    case 'ADD_EXPORT':
      return {
        ...session,
        updatedAt: now,
        exportHistory: [...session.exportHistory, action.record],
      };

    case 'RESET_SESSION':
      return createEmptySession();

    default:
      return session;
  }
}

function stateReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        pendingSavedSession: action.savedSession,
        initialized: true,
      };

    case 'RESUME_SESSION':
      if (state.pendingSavedSession) {
        return {
          ...state,
          session: state.pendingSavedSession,
          pendingSavedSession: null,
        };
      }
      return state;

    case 'RESET_SESSION':
      return {
        ...state,
        session: createEmptySession(),
        pendingSavedSession: null,
      };

    default:
      return { ...state, session: updateSession(state.session, action) };
  }
}

// --- Context ---

interface SessionContextValue {
  session: PRDSession;
  dispatch: React.Dispatch<SessionAction>;
  hasSavedSession: boolean;
  resumeSession: () => void;
  startFreshSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// --- Provider ---

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(stateReducer, null, createInitialState);
  const initRef = useRef(false);

  // On mount, check localStorage for a saved session — dispatch once through the reducer
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      const loaded = loadSession();
      const hasSaved = loaded !== null && loaded.conversation.length > 0;
      dispatch({ type: 'INIT', savedSession: hasSaved ? loaded : null });
    }
  }, []);

  // Auto-save on every session change (after initialization)
  useEffect(() => {
    if (state.initialized) {
      saveSession(state.session);
    }
  }, [state.session, state.initialized]);

  const resumeSession = useCallback(() => {
    dispatch({ type: 'RESUME_SESSION' });
  }, []);

  const startFreshSession = useCallback(() => {
    clearSession();
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  const value: SessionContextValue = {
    session: state.session,
    dispatch,
    hasSavedSession: state.initialized && state.pendingSavedSession !== null,
    resumeSession,
    startFreshSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}

// Re-export action type for consumers
export type { SessionAction };
