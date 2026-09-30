// Builds the prompt/payload sent to the local LLM and validates its response
// shape. The rule-based engine in lib/insights.ts is untouched and stays the
// default, always-on source of truth; this file only powers the separate,
// on-demand "Generate AI Insights" button. Nothing here fabricates
// participant intent — the prompt explicitly forbids it, and every finding
// the model returns must carry an observation/interpretation split plus
// evidence, or it's rejected by parseAiResponse.
import { callLocalLLM } from "./llm";
import type { VariantMetrics } from "./metrics";
import type { Insight } from "./insights";
import type { AbResponse } from "./queries";

export interface EvidencedFinding {
  observation: string;
  interpretation: string;
  evidence: string;
}

export interface EvidencedRecommendation {
  recommendation: string;
  rationale: string;
  evidence: string;
}

export interface AiInsightsReport {
  executiveSummary: string;
  keyFindings: EvidencedFinding[];
  behavioralPatterns: EvidencedFinding[];
  feedbackThemes: EvidencedFinding[];
  possibleExplanations: EvidencedFinding[];
  recommendations: EvidencedRecommendation[];
  recommendedNextTests: string[];
  highestFrictionSteps?: string[];
  generatedAt: string;
}

const SYSTEM_PROMPT = `You are a cautious UX research assistant helping analyze usability/A-B test data.
Rules you must follow strictly:
- You never fabricate what a participant thought, felt, or intended. You only work from the numbers and quoted feedback given to you.
- Use hedged, cautious language: "may indicate", "could suggest", "is worth investigating" — never "users hate this" or similarly certain claims.
- Every finding must separate what was observed (a number or a quote) from your interpretation of it, and must cite the evidence it's based on.
- Every recommendation must include a rationale and cite the evidence behind it.
- Do not invent metrics, quotes, or steps that were not provided to you.
- Respond with ONLY a single JSON object, no prose before or after, matching exactly this shape:
{
  "executiveSummary": string,
  "keyFindings": [{"observation": string, "interpretation": string, "evidence": string}],
  "behavioralPatterns": [{"observation": string, "interpretation": string, "evidence": string}],
  "feedbackThemes": [{"observation": string, "interpretation": string, "evidence": string}],
  "possibleExplanations": [{"observation": string, "interpretation": string, "evidence": string}],
  "recommendations": [{"recommendation": string, "rationale": string, "evidence": string}],
  "recommendedNextTests": [string],
  "highestFrictionSteps": [string]
}
Omit "highestFrictionSteps" (or return an empty array) if the data isn't a multi-step usability study.
For usability studies, "textFeedback" is per-step feedback and "finalFeedback" is a separate, optional whole-study wrap-up question asked once at the end — treat them as distinct sources and don't conflate them in your findings.`;

export function buildAbInsightsPayload(input: {
  testName: string;
  task: string;
  metricsA: VariantMetrics;
  metricsB: VariantMetrics;
  ruleBasedInsights: Insight[];
  feedback: AbResponse[];
}) {
  return {
    studyType: "ab" as const,
    testName: input.testName,
    task: input.task,
    metrics: { variantA: input.metricsA, variantB: input.metricsB },
    ruleBasedInsights: input.ruleBasedInsights.map((i) => ({
      observation: i.observation,
      explanation: i.explanation,
      priority: i.priority,
    })),
    participantFeedback: input.feedback.map((f) => ({ variant: f.variant, text: f.response_text })),
  };
}

export function buildUsabilityInsightsPayload(input: {
  studyName: string;
  overview: unknown;
  perStep: unknown;
  frictionRanking: unknown;
  questionSummaries: unknown;
  textFeedback: string[];
  finalFeedback?: string[];
}) {
  return {
    studyType: "usability" as const,
    studyName: input.studyName,
    overview: input.overview,
    perStep: input.perStep,
    frictionRanking: input.frictionRanking,
    questionSummaries: input.questionSummaries,
    textFeedback: input.textFeedback,
    // Whole-study final feedback (one optional question, asked once at the
    // end) — kept distinct from textFeedback, which is per-step responses.
    finalFeedback: input.finalFeedback ?? [],
  };
}

export function buildInsightsPrompt(payload: unknown): { systemPrompt: string; userPrompt: string } {
  const userPrompt = `Here is the summarized study data (JSON). Analyze it and respond with only the JSON object described in your instructions:\n\n${JSON.stringify(
    payload,
    null,
    2
  )}`;
  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

function isEvidencedFinding(v: unknown): v is EvidencedFinding {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as any).observation === "string" &&
    typeof (v as any).interpretation === "string" &&
    typeof (v as any).evidence === "string"
  );
}

function isEvidencedRecommendation(v: unknown): v is EvidencedRecommendation {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as any).recommendation === "string" &&
    typeof (v as any).rationale === "string" &&
    typeof (v as any).evidence === "string"
  );
}

// Hand-rolled shape check (no zod, per project constraints). Malformed model
// output returns null so the caller can show a clean error instead of
// caching or rendering garbage.
export function parseAiResponse(raw: string): AiInsightsReport | null {
  let text = raw.trim();
  // Some local models wrap JSON in ```json fences despite instructions — strip defensively.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;

  if (typeof p.executiveSummary !== "string") return null;
  const arrays = ["keyFindings", "behavioralPatterns", "feedbackThemes", "possibleExplanations"] as const;
  for (const key of arrays) {
    if (!Array.isArray(p[key]) || !(p[key] as unknown[]).every(isEvidencedFinding)) return null;
  }
  if (!Array.isArray(p.recommendations) || !(p.recommendations as unknown[]).every(isEvidencedRecommendation)) {
    return null;
  }
  if (!Array.isArray(p.recommendedNextTests) || !p.recommendedNextTests.every((t) => typeof t === "string")) {
    return null;
  }
  const highestFrictionSteps =
    Array.isArray(p.highestFrictionSteps) && p.highestFrictionSteps.every((t) => typeof t === "string")
      ? (p.highestFrictionSteps as string[])
      : [];

  return {
    executiveSummary: p.executiveSummary,
    keyFindings: p.keyFindings as EvidencedFinding[],
    behavioralPatterns: p.behavioralPatterns as EvidencedFinding[],
    feedbackThemes: p.feedbackThemes as EvidencedFinding[],
    possibleExplanations: p.possibleExplanations as EvidencedFinding[],
    recommendations: p.recommendations as EvidencedRecommendation[],
    recommendedNextTests: p.recommendedNextTests as string[],
    highestFrictionSteps,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateInsightsReport(payload: unknown): Promise<
  { ok: true; report: AiInsightsReport } | { ok: false; error: string }
> {
  const { systemPrompt, userPrompt } = buildInsightsPrompt(payload);
  const result = await callLocalLLM({ systemPrompt, userPrompt });
  if (!result.ok) return { ok: false, error: result.error };
  const report = parseAiResponse(result.content);
  if (!report) {
    return { ok: false, error: "The local AI server returned a response that couldn't be parsed. Try again." };
  }
  return { ok: true, report };
}
