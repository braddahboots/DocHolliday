/**
 * Types for the guided interview conversation flow (Phase 3).
 */

import type { ChecklistSection } from './session';

/** Action the user takes on a question. */
export type UserAction = 'answer' | 'approve_default' | 'skip';

/** Request body for POST /api/conversation. */
export interface ConversationTurnRequest {
  rawIdea: string;
  userMessage: string;
  currentSection: ChecklistSection;
  action: UserAction;
}

/** Response body from POST /api/conversation. */
export interface ConversationTurnResponse {
  assistantMessage: string;
  extractedData: Record<string, unknown>;
}

/** Smart default suggestion for a checklist section. */
export interface SmartDefault {
  section: ChecklistSection;
  content: string;
  summary: string;
}
