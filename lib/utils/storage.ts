/**
 * localStorage persistence for PRD sessions.
 * PRD.md §Phase 1: auto-save on every state change, session recovery on load.
 */

import type { PRDSession } from '@/lib/types/session';

const STORAGE_KEY = 'docholliday_session';

export function saveSession(session: PRDSession): void {
  try {
    const serialized = JSON.stringify(session);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // localStorage full or unavailable — silent failure per PRD (client-side only)
    console.warn('DocHolliday: Failed to save session to localStorage');
  }
}

export function loadSession(): PRDSession | null {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    return JSON.parse(serialized) as PRDSession;
  } catch {
    console.warn('DocHolliday: Failed to load session from localStorage');
    return null;
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn('DocHolliday: Failed to clear session from localStorage');
  }
}

export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__docholliday_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
