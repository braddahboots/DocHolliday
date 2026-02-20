/**
 * POST /api/gap-analysis
 * Runs ChecklistEngine gap detection on a raw idea.
 * PRD.md §Phase 2: server-side only, non-blocking for UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeGaps } from '@/lib/engine/checklist-engine';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);

  if (
    !body ||
    typeof body !== 'object' ||
    !('rawIdea' in body) ||
    typeof (body as Record<string, unknown>).rawIdea !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Request body must include a "rawIdea" string.' },
      { status: 400 },
    );
  }

  const rawIdea = (body as { rawIdea: string }).rawIdea.trim();
  if (rawIdea.length === 0) {
    return NextResponse.json(
      { error: '"rawIdea" must not be empty.' },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeGaps(rawIdea);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const status = err.status === 429 ? 429 : 502;
      return NextResponse.json(
        { error: `Anthropic API error: ${err.message}` },
        { status },
      );
    }
    return NextResponse.json(
      { error: 'Internal server error during gap analysis.' },
      { status: 500 },
    );
  }
}
