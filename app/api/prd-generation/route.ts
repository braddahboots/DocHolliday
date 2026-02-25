/**
 * POST /api/prd-generation
 * Generates a NLSpec PRD from checklist data.
 * PRD.md §Phase 4: server-side only, max 2 LLM calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePRD, buildMockPRD } from '@/lib/engine/prd-generation-engine';
import Anthropic from '@anthropic-ai/sdk';
import type { ChecklistSection, ChecklistSectionState } from '@/lib/types/session';
import { ALL_SECTIONS } from '@/lib/constants/checklist';

export const runtime = 'nodejs';

/** Validate that the request body has the expected shape. */
function validateBody(
  body: unknown,
): { rawIdea: string; sections: Record<ChecklistSection, ChecklistSectionState> } | null {
  if (!body || typeof body !== 'object') return null;

  const b = body as Record<string, unknown>;

  if (typeof b.rawIdea !== 'string' || b.rawIdea.trim().length === 0) return null;
  if (!b.sections || typeof b.sections !== 'object') return null;

  const sections = b.sections as Record<string, unknown>;

  // Validate that all 9 checklist sections exist with status
  for (const section of ALL_SECTIONS) {
    const entry = sections[section];
    if (!entry || typeof entry !== 'object') return null;
    const e = entry as Record<string, unknown>;
    if (!['pending', 'complete', 'skipped'].includes(e.status as string)) return null;
  }

  return {
    rawIdea: b.rawIdea as string,
    sections: b.sections as Record<ChecklistSection, ChecklistSectionState>,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);

  const validated = validateBody(body);
  if (!validated) {
    return NextResponse.json(
      { error: 'Request body must include "rawIdea" (string) and "sections" (checklist data).' },
      { status: 400 },
    );
  }

  try {
    const result = await generatePRD(validated.rawIdea, validated.sections);
    return NextResponse.json(result);
  } catch (err) {
    // If Anthropic API fails entirely, fall back to mock PRD
    if (err instanceof Anthropic.APIError) {
      if (err.status === 429) {
        return NextResponse.json(
          { error: 'Rate limited by Anthropic API. Please try again in 30 seconds.' },
          { status: 429 },
        );
      }
      // For other API errors, return mock PRD so the flow isn't blocked
      const mockResult = buildMockPRD(validated.rawIdea, validated.sections);
      return NextResponse.json({ prd: mockResult, mock: true });
    }
    return NextResponse.json(
      { error: 'Internal server error during PRD generation.' },
      { status: 500 },
    );
  }
}
