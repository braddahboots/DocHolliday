'use client';

/**
 * Chat panel for the guided interview (Phase 3).
 * Renders message history, loading states, smart default cards,
 * and the input field. 70% width on desktop, full width on mobile.
 */

import { useState, useRef, useEffect, type FormEvent } from 'react';
import type { ConversationMessage, ChecklistSection } from '@/lib/types/session';
import type { SmartDefault } from '@/lib/types/conversation';

// --- Sub-components ---

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-black text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
        </div>
      </div>
    </div>
  );
}

function SmartDefaultCard({
  smartDefault,
  onApprove,
  onSkip,
}: {
  smartDefault: SmartDefault;
  onApprove: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="mb-4 mx-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="text-xs font-medium text-blue-700 mb-2 uppercase tracking-wide">
        Suggested Default: {smartDefault.summary}
      </div>
      <div className="text-sm text-gray-800 whitespace-pre-wrap mb-3">
        {smartDefault.content}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// --- Main Component ---

interface ChatPanelProps {
  messages: ConversationMessage[];
  isLoading: boolean;
  currentSection: ChecklistSection | null;
  smartDefault: SmartDefault | null;
  isInterviewComplete: boolean;
  questionCount: number;
  maxQuestions: number;
  onSendMessage: (message: string) => void;
  onApproveDefault: () => void;
  onSkip: () => void;
}

export function ChatPanel({
  messages,
  isLoading,
  currentSection,
  smartDefault,
  isInterviewComplete,
  questionCount,
  maxQuestions,
  onSendMessage,
  onApproveDefault,
  onSkip,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && !isInterviewComplete) {
      inputRef.current?.focus();
    }
  }, [isLoading, isInterviewComplete]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed.length === 0 || isLoading) return;
    onSendMessage(trimmed);
    setInputValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const showSkipButton = currentSection !== null && !isLoading && !isInterviewComplete;

  return (
    <div className="flex flex-col h-full">
      {/* Message history */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Smart default card (shown after the question) */}
        {smartDefault && !isLoading && !isInterviewComplete && (
          <SmartDefaultCard
            smartDefault={smartDefault}
            onApprove={onApproveDefault}
            onSkip={onSkip}
          />
        )}

        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        {isInterviewComplete ? (
          <div className="text-center text-sm text-gray-500 py-2">
            Interview complete. Use the sidebar to generate your PRD.
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    currentSection === null
                      ? 'Describe your product idea...'
                      : 'Type your answer...'
                  }
                  disabled={isLoading}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || inputValue.trim().length === 0}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                Send
              </button>
              {showSkipButton && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
                >
                  Skip
                </button>
              )}
            </form>
            <div className="mt-1.5 text-xs text-gray-400 text-right">
              {questionCount} / {maxQuestions} questions
            </div>
          </>
        )}
      </div>
    </div>
  );
}
