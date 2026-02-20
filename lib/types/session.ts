/**
 * Core data model for DocHolliday PRD sessions.
 * Schema defined in PRD.md §Phase 1.
 */

export type ChecklistSection =
  | 'problem_evidence'
  | 'personas'
  | 'user_stories'
  | 'features_prioritized'
  | 'tech_constraints'
  | 'anti_requirements'
  | 'success_metrics'
  | 'risks_dependencies'
  | 'validation_scenarios';

export type ChecklistSectionStatus = 'pending' | 'complete' | 'skipped';

export type SessionStatus = 'interviewing' | 'generating' | 'scoring' | 'complete';

export interface ChecklistSectionState {
  status: ChecklistSectionStatus;
  completedAt: string | null;
  data: Record<string, unknown>;
}

export interface ChecklistState {
  sections: Record<ChecklistSection, ChecklistSectionState>;
  completionPercentage: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  relatedSection: ChecklistSection | null;
}

export interface GeneratedPRD {
  version: number;
  sections: {
    overview: string;
    personas: string;
    userStories: string;
    features: string;
    techRequirements: string;
    antiRequirements: string;
    successMetrics: string;
    risks: string;
    outOfScope: string;
    implementationPhases: string;
    validationHarness: string;
  };
  generatedAt: string;
}

export interface QualityScore {
  dimensions: {
    clarity: number;
    completeness: number;
    testability: number;
    agentReadiness: number;
  };
  aggregate: number;
  issues: QualityIssue[];
  passesScenarioValidation: boolean;
}

export interface QualityIssue {
  section: string;
  severity: 'blocker' | 'warning' | 'suggestion';
  message: string;
  autoFixAvailable: boolean;
}

export type ExportFormat = 'markdown' | 'pdf';
export type AgentTarget = 'cursor' | 'claude_code' | 'generic';

export interface ExportRecord {
  exportedAt: string;
  format: ExportFormat;
  agentTarget: AgentTarget;
  qualityScoreAtExport: number;
  scenarioValidationAtExport: boolean;
}

export interface PRDSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
  userInput: {
    rawIdea: string;
    attachments: string[];
  };
  checklist: ChecklistState;
  conversation: ConversationMessage[];
  prd: GeneratedPRD | null;
  qualityScore: QualityScore | null;
  exportHistory: ExportRecord[];
}
