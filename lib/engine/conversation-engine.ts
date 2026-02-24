/**
 * Conversation engine for the guided interview (Phase 3).
 *
 * Currently uses mock responses. When ANTHROPIC_API_KEY is available,
 * swap processWithMock → processWithClaude.
 *
 * Constraints (PRD §Phase 3):
 * - One question per turn
 * - Max 10 questions per session (enforced client-side)
 * - Smart defaults for: personas, tech_constraints, anti_requirements, success_metrics
 */

import type { ChecklistSection } from '@/lib/types/session';
import type {
  ConversationTurnRequest,
  ConversationTurnResponse,
  SmartDefault,
} from '@/lib/types/conversation';

/** Acknowledgment templates per section (mock mode). */
const ACKNOWLEDGMENTS: Record<ChecklistSection, string> = {
  problem_evidence:
    "Got it — I've captured the problem your product solves and the evidence behind it.",
  personas:
    "Thanks — I've noted your target users and their key characteristics.",
  user_stories:
    "Great — I've recorded those user workflows and interactions.",
  features_prioritized:
    "Perfect — I've captured your feature priorities.",
  tech_constraints:
    "Noted — I've recorded your technical requirements and constraints.",
  anti_requirements:
    "Good to know — I've documented what your product must NOT do.",
  success_metrics:
    "Clear — I've captured your success metrics and KPIs.",
  risks_dependencies:
    "Thanks — I've noted the risks and dependencies.",
  validation_scenarios:
    "Got it — I've recorded those validation scenarios.",
};

const SKIP_MESSAGES: Record<ChecklistSection, string> = {
  problem_evidence:
    "No problem — we'll skip the problem statement for now. You can always refine later.",
  personas:
    "Skipping personas for now. The quality score may be impacted, but you can refine later.",
  user_stories:
    "Skipping user stories. We'll move on to the next area.",
  features_prioritized:
    "Alright, skipping feature prioritization for now.",
  tech_constraints:
    "No worries — we'll skip tech constraints. I can suggest defaults when generating the PRD.",
  anti_requirements:
    "Skipping anti-requirements. I'll auto-generate some sensible defaults during PRD generation.",
  success_metrics:
    "Skipping success metrics for now. We can add them during refinement.",
  risks_dependencies:
    "Skipping risks and dependencies — this is an optional section anyway.",
  validation_scenarios:
    "Skipping validation scenarios — I'll auto-generate these during PRD generation.",
};

/**
 * Extract a rough app type from the idea for mock smart defaults.
 */
function extractAppType(idea: string): string {
  const lower = idea.toLowerCase();
  const keywords: Array<[string, string]> = [
    ['todo', 'task management'],
    ['habit', 'habit tracking'],
    ['recipe', 'recipe sharing'],
    ['fitness', 'fitness'],
    ['chat', 'messaging'],
    ['shop', 'e-commerce'],
    ['store', 'e-commerce'],
    ['blog', 'blogging'],
    ['social', 'social media'],
    ['game', 'gaming'],
    ['learn', 'learning'],
    ['track', 'tracking'],
    ['manage', 'management'],
    ['note', 'note-taking'],
    ['photo', 'photo sharing'],
    ['music', 'music'],
    ['health', 'health'],
    ['finance', 'finance'],
    ['budget', 'budgeting'],
  ];

  for (const [keyword, type] of keywords) {
    if (lower.includes(keyword)) return type;
  }
  return 'software';
}

/** Get a smart default suggestion for a section, or null if none applies. */
export function getSmartDefault(
  section: ChecklistSection,
  rawIdea: string,
): SmartDefault | null {
  const appType = extractAppType(rawIdea);

  switch (section) {
    case 'personas':
      return {
        section,
        summary: '2 inferred personas',
        content: `Based on your description, here are 2 personas I've inferred:

**Persona 1: Alex — The Primary User**
- Background: Tech-savvy individual looking for a better ${appType} solution
- Pain: Current tools are too complex or don't address their specific workflow
- Goal: Complete their ${appType} tasks efficiently without friction
- Anti-goal: Does NOT want to spend time learning a complex tool

**Persona 2: Jordan — The Power User**
- Background: Experienced user who has tried multiple ${appType} solutions
- Pain: Existing solutions lack the depth or customization they need
- Goal: Have full control over their ${appType} workflow with advanced features
- Anti-goal: Does NOT want a dumbed-down experience that limits capability

You can approve these, edit them, or describe your target users in your own words.`,
      };

    case 'tech_constraints':
      return {
        section,
        summary: 'Suggested tech stack',
        content: `Based on your product type, here's a suggested technical foundation:

- **Frontend**: React with TypeScript for type safety
- **Styling**: Tailwind CSS for rapid UI development
- **Backend**: Node.js API or serverless functions
- **Database**: PostgreSQL for structured data (or SQLite for simpler needs)
- **Hosting**: Vercel or similar platform for easy deployment
- **Performance target**: Page load < 2s, API response < 500ms

Approve this stack, edit it, or describe your own technical preferences.`,
      };

    case 'anti_requirements':
      return {
        section,
        summary: '4 auto-generated constraints',
        content: `Based on your ${appType} product, here are constraints it should respect:

1. **Must NOT** collect or store user data beyond what's essential for core functionality
2. **Must NOT** require account creation to use basic features
3. **Must NOT** send notifications without explicit user opt-in
4. **Must NOT** depend on a single third-party service with no fallback

Approve these, edit them, or add your own anti-requirements.`,
      };

    case 'success_metrics':
      return {
        section,
        summary: '3 suggested KPIs',
        content: `Here are 3 KPIs to measure success:

1. **User engagement**: % of users who complete the core action within their first session (target: >= 60%)
2. **Retention**: % of users who return within 7 days of first use (target: >= 40%)
3. **Task completion rate**: % of started workflows that are successfully completed (target: >= 80%)

Approve these, edit them, or define your own success metrics.`,
      };

    default:
      return null;
  }
}

/** Process a conversation turn. Uses mock responses (no API key required). */
export async function processConversationTurn(
  request: ConversationTurnRequest,
): Promise<ConversationTurnResponse> {
  // TODO: When ANTHROPIC_API_KEY is available, replace with real Claude call
  return processWithMock(request);
}

function processWithMock(
  request: ConversationTurnRequest,
): ConversationTurnResponse {
  const { currentSection, action, userMessage, rawIdea } = request;

  if (action === 'skip') {
    return {
      assistantMessage: SKIP_MESSAGES[currentSection],
      extractedData: {},
    };
  }

  if (action === 'approve_default') {
    const smartDefault = getSmartDefault(currentSection, rawIdea);
    return {
      assistantMessage: `${ACKNOWLEDGMENTS[currentSection]} I've used the suggested defaults.`,
      extractedData: {
        approved_default: true,
        content: smartDefault?.content ?? '',
      },
    };
  }

  // action === 'answer'
  return {
    assistantMessage: ACKNOWLEDGMENTS[currentSection],
    extractedData: { user_response: userMessage },
  };
}
