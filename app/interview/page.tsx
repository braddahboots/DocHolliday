'use client';

/**
 * Guided interview page (Phase 3).
 *
 * Orchestrates the full conversation flow:
 * 1. User enters raw idea
 * 2. Gap analysis runs (mock fallback if API unavailable)
 * 3. Questions presented one at a time from prioritized list
 * 4. User answers / approves default / skips
 * 5. Checklist updates in real time
 * 6. Interview ends at 10 questions or all sections addressed
 *
 * PRD constraints:
 * - Max 10 questions per session
 * - One question per turn
 * - Session persists across refresh (via SessionContext)
 */

import { useState, useCallback, useRef } from 'react';
import { useSession } from '@/lib/context/session-context';
import { ChatPanel } from '@/components/chat-panel';
import { ChecklistSidebar } from '@/components/checklist-sidebar';
import { getSmartDefault } from '@/lib/engine/conversation-engine';
import { CHECKLIST_SECTIONS, ALL_SECTIONS } from '@/lib/constants/checklist';
import type { ChecklistSection, ConversationMessage, GeneratedPRD } from '@/lib/types/session';
import type { GapAnalysisResult, PrioritizedQuestion } from '@/lib/types/gap-analysis';
import type { SmartDefault, ConversationTurnResponse } from '@/lib/types/conversation';

const MAX_QUESTIONS = 10;

const WELCOME_MESSAGE =
  "Welcome to DocHolliday! Describe your product idea in a few sentences — what does it do, who is it for, and what problem does it solve?";

/**
 * Generate a mock gap analysis when the API is unavailable.
 * Marks all sections as unaddressed so the user gets the full interview.
 */
function mockGapAnalysis(): GapAnalysisResult {
  const sections = Object.fromEntries(
    ALL_SECTIONS.map((s) => [
      s,
      { addressed: false, confidence: 0, extractedData: {}, gaps: ['Needs user input'] },
    ]),
  ) as GapAnalysisResult['sections'];

  const prioritizedQuestions: PrioritizedQuestion[] = ALL_SECTIONS
    .map((s) => ({
      section: s,
      question: getQuestionForSection(s),
      weight: CHECKLIST_SECTIONS[s].weight,
      required: CHECKLIST_SECTIONS[s].required,
    }))
    .sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return b.weight - a.weight;
    });

  return { sections, prioritizedQuestions, retried: false, fellBackToDefault: true };
}

/** Static question text per section (used for mock fallback). */
function getQuestionForSection(section: ChecklistSection): string {
  const questions: Record<ChecklistSection, string> = {
    problem_evidence:
      'What specific problem does your product solve, and what evidence do you have that this problem exists?',
    personas:
      'Who are the target users? Describe their background, pain points, and goals.',
    user_stories:
      'What are the key workflows? Describe what a user would do step-by-step in your product.',
    features_prioritized:
      'What are the must-have features for the first version? What could wait for later?',
    tech_constraints:
      'Are there any technology preferences, platform requirements, or performance constraints?',
    anti_requirements:
      'Is there anything the product should explicitly NOT do? Any features or behaviors to avoid?',
    success_metrics:
      'How will you measure success? What specific metrics or KPIs matter?',
    risks_dependencies:
      'Are there any known risks, assumptions, or external dependencies?',
    validation_scenarios:
      'Describe 2-3 end-to-end scenarios that, if they work correctly, prove the product works.',
  };
  return questions[section];
}

type InterviewPhase = 'idle' | 'analyzing' | 'interviewing' | 'complete';

export default function InterviewPage() {
  const { session, dispatch, hasSavedSession, resumeSession, startFreshSession } = useSession();

  const [phase, setPhase] = useState<InterviewPhase>(() => {
    if (session.conversation.length > 0 && session.userInput.rawIdea) {
      return session.status === 'complete' ? 'complete' : 'interviewing';
    }
    return 'idle';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisResult | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const questionCountRef = useRef(0);

  // Derive current section from gap analysis + question index
  const currentQuestion: PrioritizedQuestion | null =
    gapAnalysis?.prioritizedQuestions[questionIndex] ?? null;
  const currentSection: ChecklistSection | null = currentQuestion?.section ?? null;

  // Smart default for current section
  const smartDefault: SmartDefault | null =
    currentSection ? getSmartDefault(currentSection, session.userInput.rawIdea) : null;

  const canGenerate = session.checklist.completionPercentage >= 75;

  /** Advance to the next unanswered question, or end the interview. */
  const advanceToNextQuestion = useCallback(
    (ackMessage: string) => {
      if (!gapAnalysis) return;

      const nextCount = questionCountRef.current + 1;

      // Find next unanswered question
      let nextIdx = questionIndex + 1;
      while (nextIdx < gapAnalysis.prioritizedQuestions.length) {
        const nextQ = gapAnalysis.prioritizedQuestions[nextIdx];
        const sectionState = session.checklist.sections[nextQ.section];
        if (sectionState.status === 'pending') break;
        nextIdx++;
      }

      const hasMoreQuestions = nextIdx < gapAnalysis.prioritizedQuestions.length;
      const underQuestionLimit = nextCount <= MAX_QUESTIONS;

      if (hasMoreQuestions && underQuestionLimit) {
        const nextQ = gapAnalysis.prioritizedQuestions[nextIdx];
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            role: 'assistant',
            content: `${ackMessage}\n\n${nextQ.question}`,
            relatedSection: nextQ.section,
          },
        });
        setQuestionIndex(nextIdx);
        questionCountRef.current = nextCount;
        setQuestionCount(nextCount);
      } else {
        const completionPct = session.checklist.completionPercentage;
        const completionMsg = !underQuestionLimit
          ? `${ackMessage}\n\nWe've covered the maximum number of questions. Your spec is ${completionPct}% complete.`
          : `${ackMessage}\n\nGreat — we've covered all the key areas! Your spec is ${completionPct}% complete.`;

        const canGen = completionPct >= 75;
        const suffix = canGen
          ? ' You can now generate your PRD using the sidebar.'
          : ' You can still generate a PRD, though adding more detail would improve the quality.';

        dispatch({
          type: 'ADD_MESSAGE',
          message: { role: 'assistant', content: completionMsg + suffix, relatedSection: null },
        });
        setPhase('complete');
      }
    },
    [gapAnalysis, questionIndex, session.checklist.sections, session.checklist.completionPercentage, dispatch],
  );

  /** Step 2+: User answers a question. */
  const handleAnswer = useCallback(
    async (userMessage: string) => {
      if (!currentSection || !gapAnalysis) return;

      dispatch({
        type: 'ADD_MESSAGE',
        message: { role: 'user', content: userMessage, relatedSection: currentSection },
      });

      setIsLoading(true);

      try {
        let turnResult: ConversationTurnResponse;
        try {
          const response = await fetch('/api/conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rawIdea: session.userInput.rawIdea,
              userMessage,
              currentSection,
              action: 'answer',
            }),
          });

          if (!response.ok) throw new Error('Conversation API failed');
          turnResult = (await response.json()) as ConversationTurnResponse;
        } catch {
          turnResult = {
            assistantMessage: "Got it — I've recorded your response.",
            extractedData: { user_response: userMessage },
          };
        }

        dispatch({
          type: 'UPDATE_SECTION',
          section: currentSection,
          status: 'complete',
          data: turnResult.extractedData,
        });

        advanceToNextQuestion(turnResult.assistantMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentSection, gapAnalysis, session.userInput.rawIdea, dispatch, advanceToNextQuestion],
  );

  /** User approves a smart default. */
  const handleApproveDefault = useCallback(async () => {
    if (!currentSection || !gapAnalysis) return;

    const defaultContent = smartDefault?.content ?? '';

    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        role: 'user',
        content: `[Approved suggested default: ${smartDefault?.summary ?? 'default'}]`,
        relatedSection: currentSection,
      },
    });

    setIsLoading(true);

    try {
      let turnResult: ConversationTurnResponse;
      try {
        const response = await fetch('/api/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawIdea: session.userInput.rawIdea,
            userMessage: defaultContent,
            currentSection,
            action: 'approve_default',
          }),
        });

        if (!response.ok) throw new Error('Conversation API failed');
        turnResult = (await response.json()) as ConversationTurnResponse;
      } catch {
        turnResult = {
          assistantMessage: "I've applied the suggested defaults.",
          extractedData: { approved_default: true, content: defaultContent },
        };
      }

      dispatch({
        type: 'UPDATE_SECTION',
        section: currentSection,
        status: 'complete',
        data: turnResult.extractedData,
      });

      advanceToNextQuestion(turnResult.assistantMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentSection, gapAnalysis, smartDefault, session.userInput.rawIdea, dispatch, advanceToNextQuestion]);

  /** User skips a question. */
  const handleSkip = useCallback(async () => {
    if (!currentSection || !gapAnalysis) return;

    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        role: 'user',
        content: '[Skipped]',
        relatedSection: currentSection,
      },
    });

    setIsLoading(true);

    try {
      let turnResult: ConversationTurnResponse;
      try {
        const response = await fetch('/api/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawIdea: session.userInput.rawIdea,
            userMessage: '',
            currentSection,
            action: 'skip',
          }),
        });

        if (!response.ok) throw new Error('Conversation API failed');
        turnResult = (await response.json()) as ConversationTurnResponse;
      } catch {
        turnResult = {
          assistantMessage: 'No problem — skipping this section.',
          extractedData: {},
        };
      }

      dispatch({
        type: 'UPDATE_SECTION',
        section: currentSection,
        status: 'skipped',
      });

      advanceToNextQuestion(turnResult.assistantMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentSection, gapAnalysis, session.userInput.rawIdea, dispatch, advanceToNextQuestion]);

  /** Step 1: User submits their raw idea. */
  const handleIdeaSubmit = useCallback(
    async (ideaText: string) => {
      dispatch({ type: 'SET_RAW_IDEA', rawIdea: ideaText });

      if (session.conversation.length === 0) {
        dispatch({
          type: 'ADD_MESSAGE',
          message: { role: 'assistant', content: WELCOME_MESSAGE, relatedSection: null },
        });
      }

      dispatch({
        type: 'ADD_MESSAGE',
        message: { role: 'user', content: ideaText, relatedSection: null },
      });

      setIsLoading(true);
      setPhase('analyzing');

      let result: GapAnalysisResult;
      try {
        const response = await fetch('/api/gap-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawIdea: ideaText }),
        });

        if (!response.ok) throw new Error('Gap analysis API failed');
        result = (await response.json()) as GapAnalysisResult;
      } catch {
        result = mockGapAnalysis();
      }

      for (const section of ALL_SECTIONS) {
        const analysis = result.sections[section];
        if (analysis.addressed && analysis.confidence >= 0.7) {
          dispatch({
            type: 'UPDATE_SECTION',
            section,
            status: 'complete',
            data: analysis.extractedData,
          });
        }
      }

      setGapAnalysis(result);

      if (result.prioritizedQuestions.length > 0) {
        const firstQ = result.prioritizedQuestions[0];
        const intro = `I've analyzed your idea and identified some areas to cover. Let me ask you a few targeted questions.\n\n${firstQ.question}`;
        dispatch({
          type: 'ADD_MESSAGE',
          message: { role: 'assistant', content: intro, relatedSection: firstQ.section },
        });
        setQuestionIndex(0);
        questionCountRef.current = 1;
        setQuestionCount(1);
        setPhase('interviewing');
      } else {
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            role: 'assistant',
            content: "Your idea is very detailed — all key areas are covered! You're ready to generate the PRD.",
            relatedSection: null,
          },
        });
        setPhase('complete');
      }

      setIsLoading(false);
    },
    [dispatch, session.conversation.length],
  );

  /** Handle the "Generate PRD" button click (Phase 4). */
  const handleGeneratePRD = useCallback(async () => {
    dispatch({ type: 'SET_STATUS', status: 'generating' });
    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        role: 'assistant',
        content: 'Generating your PRD from the interview data. This may take up to 30 seconds...',
        relatedSection: null,
      },
    });
    setIsLoading(true);

    try {
      const response = await fetch('/api/prd-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawIdea: session.userInput.rawIdea,
          sections: session.checklist.sections,
        }),
      });

      if (response.status === 429) {
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            role: 'assistant',
            content: 'Rate limited by the AI service. Please try again in 30 seconds.',
            relatedSection: null,
          },
        });
        dispatch({ type: 'SET_STATUS', status: 'interviewing' });
        return;
      }

      if (!response.ok) throw new Error('PRD generation API failed');

      const result = (await response.json()) as { prd: GeneratedPRD; mock: boolean };

      dispatch({ type: 'SET_PRD', prd: result.prd });
      dispatch({ type: 'SET_STATUS', status: 'complete' });

      const mockNote = result.mock
        ? '\n\n*Note: Generated using local templates (AI service unavailable). Regenerate when the API is connected for richer output.*'
        : '';

      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          role: 'assistant',
          content: `Your PRD has been generated! It includes all 11 NLSpec sections based on your interview responses.${mockNote}\n\nYou can review it in the preview below.`,
          relatedSection: null,
        },
      });

      setPhase('complete');
    } catch {
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          role: 'assistant',
          content: 'There was an error generating the PRD. Your checklist data is saved — please try again.',
          relatedSection: null,
        },
      });
      dispatch({ type: 'SET_STATUS', status: 'interviewing' });
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, session.userInput.rawIdea, session.checklist.sections]);

  /** Route messages: initial idea vs. interview answer. */
  const handleSendMessage = useCallback(
    (message: string) => {
      if (phase === 'idle' || phase === 'analyzing') {
        handleIdeaSubmit(message);
      } else if (phase === 'interviewing') {
        handleAnswer(message);
      }
    },
    [phase, handleIdeaSubmit, handleAnswer],
  );

  // --- Session recovery banner ---
  if (hasSavedSession && phase === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Welcome back!</h2>
          <p className="text-sm text-gray-600 mb-4">
            You have a saved session. Would you like to continue where you left off?
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                resumeSession();
                setPhase('interviewing');
              }}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => {
                startFreshSession();
                setPhase('idle');
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Build the messages list for display (add welcome if empty)
  const displayMessages: ConversationMessage[] =
    session.conversation.length > 0
      ? session.conversation
      : [
          {
            id: 'welcome',
            role: 'assistant' as const,
            content: WELCOME_MESSAGE,
            timestamp: new Date().toISOString(),
            relatedSection: null,
          },
        ];

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Checklist sidebar: collapsible top bar on mobile, left panel on desktop */}
      <div className="order-1 md:w-[30%] md:min-w-[280px] md:max-w-[360px]">
        <ChecklistSidebar
          checklist={session.checklist}
          currentSection={currentSection}
          canGenerate={canGenerate}
          onGeneratePRD={handleGeneratePRD}
        />
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-h-0 order-2">
        <ChatPanel
          messages={displayMessages}
          isLoading={isLoading}
          currentSection={phase === 'interviewing' ? currentSection : null}
          smartDefault={phase === 'interviewing' ? smartDefault : null}
          isInterviewComplete={phase === 'complete'}
          questionCount={questionCount}
          maxQuestions={MAX_QUESTIONS}
          onSendMessage={handleSendMessage}
          onApproveDefault={handleApproveDefault}
          onSkip={handleSkip}
        />
      </div>
    </div>
  );
}
