/**
 * POST /api/conversation
 * Processes a single conversation turn in the guided interview.
 * PRD.md §Phase 3: one question per turn, max 10 questions (enforced client-side).
 */

import { NextRequest, NextResponse } from 'next/server';
import { processConversationTurn } from '@/lib/engine/conversation-engine';
import { ALL_SECTIONS } from '@/lib/constants/checklist';
import type { ChecklistSection } from '@/lib/types/session';
import type { UserAction } from '@/lib/types/conversation';

export const runtime = 'nodejs';

const VALID_ACTIONS: UserAction[] = ['answer', 'approve_default', 'skip'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Request body must be a JSON object.' },
      { status: 400 },
    );
  }

  const b = body as Record<string, unknown>;

  if (typeof b.rawIdea !== 'string' || b.rawIdea.trim().length === 0) {
    return NextResponse.json(
      { error: '"rawIdea" must be a non-empty string.' },
      { status: 400 },
    );
  }

  if (typeof b.userMessage !== 'string') {
    return NextResponse.json(
      { error: '"userMessage" must be a string.' },
      { status: 400 },
    );
  }

  if (
    typeof b.currentSection !== 'string' ||
    !ALL_SECTIONS.includes(b.currentSection as ChecklistSection)
  ) {
    return NextResponse.json(
      { error: '"currentSection" must be a valid checklist section.' },
      { status: 400 },
    );
  }

  if (
    typeof b.action !== 'string' ||
    !VALID_ACTIONS.includes(b.action as UserAction)
  ) {
    return NextResponse.json(
      { error: '"action" must be one of: answer, approve_default, skip.' },
      { status: 400 },
    );
  }

  try {
    const result = await processConversationTurn({
      rawIdea: b.rawIdea as string,
      userMessage: b.userMessage as string,
      currentSection: b.currentSection as ChecklistSection,
      action: b.action as UserAction,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error during conversation processing.' },
      { status: 500 },
    );
  }
}
