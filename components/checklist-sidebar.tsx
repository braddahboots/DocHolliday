'use client';

/**
 * Checklist progress sidebar for the guided interview (Phase 3).
 * Right panel (30% width on desktop); collapses to top progress bar on mobile.
 * Reads section state from SessionContext.
 */

import { useState } from 'react';
import type { ChecklistState, ChecklistSection } from '@/lib/types/session';
import { CHECKLIST_SECTIONS, REQUIRED_SECTIONS } from '@/lib/constants/checklist';

const SECTION_ORDER: ChecklistSection[] = [
  'problem_evidence',
  'personas',
  'user_stories',
  'features_prioritized',
  'tech_constraints',
  'anti_requirements',
  'success_metrics',
  'risks_dependencies',
  'validation_scenarios',
];

function StatusIcon({ status }: { status: 'pending' | 'complete' | 'skipped' }) {
  switch (status) {
    case 'complete':
      return (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs font-bold">
          &#10003;
        </span>
      );
    case 'skipped':
      return (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-400 text-xs">
          &mdash;
        </span>
      );
    default:
      return (
        <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-gray-300" />
      );
  }
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">Completion</span>
        <span className="text-xs font-bold text-gray-900">{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out bg-black"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// --- Main Component ---

interface ChecklistSidebarProps {
  checklist: ChecklistState;
  currentSection: ChecklistSection | null;
  canGenerate: boolean;
  onGeneratePRD: () => void;
}

export function ChecklistSidebar({
  checklist,
  currentSection,
  canGenerate,
  onGeneratePRD,
}: ChecklistSidebarProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const { sections, completionPercentage } = checklist;

  const requiredComplete = REQUIRED_SECTIONS.filter(
    (s) => sections[s].status === 'complete',
  ).length;
  const requiredSkipped = REQUIRED_SECTIONS.filter(
    (s) => sections[s].status === 'skipped',
  ).length;

  const generateTooltip = canGenerate
    ? undefined
    : `Need >= 75% completion. Currently ${completionPercentage}%.`;

  return (
    <>
      {/* Mobile: collapsed progress bar */}
      <div className="md:hidden border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="w-full px-4 py-3 flex items-center gap-3"
        >
          <div className="flex-1">
            <ProgressBar percentage={completionPercentage} />
          </div>
          <span className="text-gray-400 text-sm">
            {mobileExpanded ? '\u25B2' : '\u25BC'}
          </span>
        </button>

        {mobileExpanded && (
          <div className="px-4 pb-3">
            <SectionList
              sections={sections}
              currentSection={currentSection}
            />
            {requiredSkipped >= 3 && (
              <SkipWarning count={requiredSkipped} />
            )}
          </div>
        )}
      </div>

      {/* Desktop: full sidebar */}
      <div className="hidden md:flex flex-col h-full bg-gray-50 border-l border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            PRD Checklist
          </h2>
          <ProgressBar percentage={completionPercentage} />
          <div className="mt-1 text-xs text-gray-500">
            {requiredComplete} of {REQUIRED_SECTIONS.length} required sections
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <SectionList
            sections={sections}
            currentSection={currentSection}
          />
        </div>

        {requiredSkipped >= 3 && (
          <div className="px-4">
            <SkipWarning count={requiredSkipped} />
          </div>
        )}

        <div className="p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onGeneratePRD}
            disabled={!canGenerate}
            title={generateTooltip}
            className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
              canGenerate
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Generate PRD
          </button>
          {!canGenerate && (
            <p className="mt-1.5 text-xs text-gray-400 text-center">
              {completionPercentage}% complete — need 75% to generate
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// --- Shared sub-components ---

function SectionList({
  sections,
  currentSection,
}: {
  sections: ChecklistState['sections'];
  currentSection: ChecklistSection | null;
}) {
  return (
    <ul className="space-y-2">
      {SECTION_ORDER.map((key) => {
        const section = sections[key];
        const meta = CHECKLIST_SECTIONS[key];
        const isCurrent = key === currentSection;

        return (
          <li
            key={key}
            className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
              isCurrent ? 'bg-blue-50 ring-1 ring-blue-200' : ''
            }`}
          >
            <StatusIcon status={section.status} />
            <span
              className={`flex-1 ${
                section.status === 'complete'
                  ? 'text-gray-900'
                  : section.status === 'skipped'
                    ? 'text-gray-400 line-through'
                    : 'text-gray-600'
              }`}
            >
              {meta.label}
            </span>
            <span className="text-xs text-gray-400">
              {Math.round(meta.weight * 100)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SkipWarning({ count }: { count: number }) {
  return (
    <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 mb-3 text-xs text-amber-800">
      {count} required sections skipped — quality score will be impacted.
    </div>
  );
}
