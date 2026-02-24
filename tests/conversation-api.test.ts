/**
 * Unit tests for the POST /api/conversation route (Phase 3).
 * Tests request validation and response shape.
 */

import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/conversation/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/conversation', () => {
  it('returns 400 for missing rawIdea', async () => {
    const req = makeRequest({ userMessage: 'hello', currentSection: 'personas', action: 'answer' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('rawIdea');
  });

  it('returns 400 for empty rawIdea', async () => {
    const req = makeRequest({ rawIdea: '  ', userMessage: 'hello', currentSection: 'personas', action: 'answer' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing userMessage', async () => {
    const req = makeRequest({ rawIdea: 'an app', currentSection: 'personas', action: 'answer' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('userMessage');
  });

  it('returns 400 for invalid currentSection', async () => {
    const req = makeRequest({ rawIdea: 'an app', userMessage: 'hello', currentSection: 'invalid_section', action: 'answer' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('currentSection');
  });

  it('returns 400 for invalid action', async () => {
    const req = makeRequest({ rawIdea: 'an app', userMessage: 'hello', currentSection: 'personas', action: 'invalid' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('action');
  });

  it('returns 200 with valid answer request', async () => {
    const req = makeRequest({
      rawIdea: 'a habit tracker app',
      userMessage: 'It helps people build daily habits.',
      currentSection: 'problem_evidence',
      action: 'answer',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('assistantMessage');
    expect(body).toHaveProperty('extractedData');
    expect(typeof body.assistantMessage).toBe('string');
    expect(body.assistantMessage.length).toBeGreaterThan(0);
  });

  it('returns 200 with valid skip request', async () => {
    const req = makeRequest({
      rawIdea: 'a habit tracker app',
      userMessage: '',
      currentSection: 'success_metrics',
      action: 'skip',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.extractedData).toEqual({});
  });

  it('returns 200 with valid approve_default request', async () => {
    const req = makeRequest({
      rawIdea: 'a habit tracker app',
      userMessage: 'approved',
      currentSection: 'personas',
      action: 'approve_default',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.extractedData).toHaveProperty('approved_default', true);
  });

  it('handles malformed JSON body', async () => {
    const req = new Request('http://localhost:3000/api/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('works for all valid sections', async () => {
    const sections = [
      'problem_evidence', 'personas', 'user_stories', 'features_prioritized',
      'tech_constraints', 'anti_requirements', 'success_metrics',
      'risks_dependencies', 'validation_scenarios',
    ];

    for (const section of sections) {
      const req = makeRequest({
        rawIdea: 'an app',
        userMessage: 'some answer',
        currentSection: section,
        action: 'answer',
      });
      const res = await POST(req as never);
      expect(res.status).toBe(200);
    }
  });
});
