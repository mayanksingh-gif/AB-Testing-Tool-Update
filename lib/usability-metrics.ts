// Thin adapter over lib/metrics.ts's primitives for usability studies. No new
// math is invented where the shape already matches (interactionCount,
// unhandledCount, backtrackingCount, navigationPath all work unmodified once
// usability rows are read as plain {session_id, event_type, elapsed_ms,
// presented_node_id, handled} — which usability-queries.ts already returns).
import {
  interactionCount as countInteractions,
  unhandledCount as countUnhandled,
  navigationPath as pathForSession,
  backtrackingCount,
  fmtMs,
  fmtPct,
} from "./metrics";
import type {
  UsabilityStep,
  UsabilityStepSession,
  UsabilitySession,
  UsabilityQuestion,
  UsabilityResponse,
  UsabilityEventRow,
} from "./usability-queries";

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export interface UsabilityOverview {
  participants: number;
  completed: number;
  completionRate: number | null;
  medianStudyDurationMs: number | null;
  avgStepsCompleted: number | null;
  deviceBreakdown: Record<string, number>;
}

export function computeUsabilityOverview(
  sessions: UsabilitySession[],
  stepSessions: UsabilityStepSession[],
  steps: UsabilityStep[]
): UsabilityOverview {
  const participants = sessions.length;
  const completed = sessions.filter((s) => s.status === "completed").length;
  const completionRate = participants > 0 ? completed / participants : null;

  const durations: number[] = [];
  const stepsCompletedPerSession: number[] = [];
  const deviceBreakdown: Record<string, number> = {};

  for (const session of sessions) {
    deviceBreakdown[session.device_type] = (deviceBreakdown[session.device_type] ?? 0) + 1;
    if (session.completed_at) {
      const durationMs = new Date(session.completed_at).getTime() - new Date(session.started_at).getTime();
      if (durationMs >= 0) durations.push(durationMs);
    }
    const completedSteps = stepSessions.filter((ss) => ss.session_id === session.id && ss.status === "completed").length;
    stepsCompletedPerSession.push(completedSteps);
  }

  return {
    participants,
    completed,
    completionRate,
    medianStudyDurationMs: median(durations),
    avgStepsCompleted: average(stepsCompletedPerSession),
    deviceBreakdown,
  };
}

export interface StepAnalysis {
  stepId: string;
  title: string;
  stepOrder: number;
  started: number;
  completed: number;
  completionRate: number | null;
  medianDurationMs: number | null;
  avgInteractions: number | null;
  avgUnhandled: number | null;
  avgBacktracking: number | null;
}

export function computeStepAnalysis(
  steps: UsabilityStep[],
  stepSessions: UsabilityStepSession[],
  events: UsabilityEventRow[]
): StepAnalysis[] {
  // metrics.ts's session-scoped functions key off `session_id` — for
  // per-step analysis that's the step_session's id, so events rows carry
  // both session_id and step_id and we filter by step first.
  return steps.map((step) => {
    const stepStepSessions = stepSessions.filter((ss) => ss.step_id === step.id);
    const started = stepStepSessions.length;
    const completedSessions = stepStepSessions.filter((ss) => ss.status === "completed");
    const completionRate = started > 0 ? completedSessions.length / started : null;
    const durations = completedSessions.map((ss) => ss.duration_ms).filter((d): d is number => d != null);

    const stepEvents = events.filter((e) => e.step_id === step.id);
    const interactionCounts: number[] = [];
    const unhandledCounts: number[] = [];
    const backtrackCounts: number[] = [];

    for (const ss of stepStepSessions) {
      const sessionEvents = stepEvents.filter((e) => e.session_id === ss.session_id);
      interactionCounts.push(countInteractions(sessionEvents as any, ss.session_id));
      unhandledCounts.push(countUnhandled(sessionEvents as any, ss.session_id));
      const path = pathForSession(sessionEvents as any, ss.session_id);
      backtrackCounts.push(backtrackingCount(path));
    }

    return {
      stepId: step.id,
      title: step.title,
      stepOrder: step.step_order,
      started,
      completed: completedSessions.length,
      completionRate,
      medianDurationMs: median(durations),
      avgInteractions: average(interactionCounts),
      avgUnhandled: average(unhandledCounts),
      avgBacktracking: average(backtrackCounts),
    };
  });
}

export interface FrictionRankedStep extends StepAnalysis {
  frictionScore: number;
}

// A simple weighted heuristic, explicitly labeled "Friction indicator" in the
// UI — never framed as statistically significant. Higher unhandled clicks,
// more backtracking, and lower completion all push a step's score up.
export function rankFrictionSteps(perStep: StepAnalysis[]): FrictionRankedStep[] {
  return perStep
    .map((s) => {
      const dropoff = s.completionRate == null ? 0 : 1 - s.completionRate;
      const frictionScore = dropoff * 50 + (s.avgUnhandled ?? 0) * 10 + (s.avgBacktracking ?? 0) * 15;
      return { ...s, frictionScore: Math.round(frictionScore * 10) / 10 };
    })
    .sort((a, b) => b.frictionScore - a.frictionScore);
}

export interface QuestionSummary {
  questionId: string;
  questionText: string;
  questionType: string;
  responseCount: number;
  // rating: average score. single_choice/yes_no: option -> count. text: raw responses.
  averageRating?: number | null;
  optionCounts?: Record<string, number>;
  textResponses?: string[];
}

export function summarizeQuestions(
  questions: UsabilityQuestion[],
  responses: UsabilityResponse[]
): QuestionSummary[] {
  return questions.map((q) => {
    const qResponses = responses.filter((r) => r.question_id === q.id);
    const summary: QuestionSummary = {
      questionId: q.id,
      questionText: q.question_text,
      questionType: q.question_type,
      responseCount: qResponses.length,
    };
    if (q.question_type === "rating") {
      const nums = qResponses.map((r) => r.numeric_response).filter((n): n is number => n != null);
      summary.averageRating = average(nums);
    } else if (q.question_type === "single_choice" || q.question_type === "yes_no") {
      const counts: Record<string, number> = {};
      for (const r of qResponses) {
        if (r.selected_option) counts[r.selected_option] = (counts[r.selected_option] ?? 0) + 1;
      }
      summary.optionCounts = counts;
    } else {
      summary.textResponses = qResponses.map((r) => r.text_response).filter((t): t is string => !!t);
    }
    return summary;
  });
}

export { fmtMs, fmtPct };
