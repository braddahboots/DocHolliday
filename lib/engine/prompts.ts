/**
 * Structured prompts for the ChecklistEngine gap analysis.
 * PRD.md §Phase 2: exact prompt structure.
 */

const SECTION_DESCRIPTIONS = `- problem_evidence: Is there a clear problem statement with evidence?
- personas: Are target users described with enough detail to infer needs, pain points, and goals?
- user_stories: Are there describable user workflows or interactions?
- features_prioritized: Are features mentioned? Can they be prioritized?
- tech_constraints: Are there technology preferences, performance requirements, or platform targets?
- anti_requirements: Are there any "must not" constraints mentioned?
- success_metrics: Are there measurable outcomes or KPIs?
- risks_dependencies: Are risks, assumptions, or external dependencies mentioned?
- validation_scenarios: Are there testable end-to-end scenarios described?` as const;

const JSON_SCHEMA = `{
  "problem_evidence": { "addressed": boolean, "confidence": 0.0-1.0, "extractedData": {...}, "gaps": [string] },
  "personas": { "addressed": boolean, "confidence": 0.0-1.0, "extractedData": {...}, "gaps": [string] },
  "user_stories": { "addressed": boolean, "confidence": 0.0-1.0, "extractedData": {...}, "gaps": [string] },
  "features_prioritized": { "addressed": boolean, "confidence": 0.0-1.0, "extractedData": {...}, "gaps": [string] },
  "tech_constraints": { "addressed": boolean, "confidence": 0.0-1.0, "extractedData": {...}, "gaps": [string] },
  "anti_requirements": { "addressed": boolean, "confidence": 0.0-1.0, "extractedData": {...}, "gaps": [string] },
  "success_metrics": { "addressed": boolean, "confidence": 0.0-1.0, "extractedData": {...}, "gaps": [string] },
  "risks_dependencies": { "addressed": boolean, "confidence": 0.0-1.0, "extractedData": {...}, "gaps": [string] },
  "validation_scenarios": { "addressed": boolean, "confidence": 0.0-1.0, "extractedData": {...}, "gaps": [string] }
}` as const;

export function buildPrimaryPrompt(rawIdea: string): string {
  return `You are analyzing a product idea to determine which PRD sections are addressed.

User's idea: "${rawIdea}"

For each section below, determine:
1. Is it addressed in the user's input? (true/false)
2. Confidence that it's sufficiently detailed (0.0-1.0)
3. What specific data can be extracted?
4. What specific gaps remain?

CRITICAL: Do NOT invent or infer information the user did not explicitly provide. If the user did not mention personas, do NOT fabricate them. Flag as missing.

Sections to evaluate:
${SECTION_DESCRIPTIONS}

Respond in JSON only. No preamble, no markdown fences. Use this exact schema:
${JSON_SCHEMA}`;
}

export function buildRetryPrompt(rawIdea: string): string {
  return `Analyze this product idea and return ONLY valid JSON. No text before or after.

Idea: "${rawIdea}"

For each section, return: addressed (boolean), confidence (number 0-1), extractedData (object), gaps (string array).

Sections: problem_evidence, personas, user_stories, features_prioritized, tech_constraints, anti_requirements, success_metrics, risks_dependencies, validation_scenarios

Return valid JSON only.`;
}
