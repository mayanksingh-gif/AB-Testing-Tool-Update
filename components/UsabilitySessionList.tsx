"use client";

import { useState } from "react";
import type {
  UsabilitySession,
  UsabilityStepSession,
  UsabilityStep,
  UsabilityQuestion,
  UsabilityResponse,
  UsabilityEventRow,
} from "@/lib/usability-queries";
import { navigationPath, interactionCount, unhandledCount } from "@/lib/metrics";
import PathVisualization from "./results/PathVisualization";

function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

// Adapts SessionList.tsx's expand/collapse pattern one level deeper: each
// participant session expands into its per-step journey (status, duration,
// question response) rather than a single flat timeline.
export default function UsabilitySessionList({
  sessions,
  stepSessions,
  steps,
  questions,
  responses,
  events,
}: {
  sessions: UsabilitySession[];
  stepSessions: UsabilityStepSession[];
  steps: UsabilityStep[];
  questions: UsabilityQuestion[];
  responses: UsabilityResponse[];
  events: UsabilityEventRow[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const stepById = new Map(steps.map((s) => [s.id, s]));
  const questionsByStep = new Map<string, UsabilityQuestion[]>();
  for (const q of questions) {
    questionsByStep.set(q.step_id, [...(questionsByStep.get(q.step_id) ?? []), q]);
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-slate-400">No participant sessions yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {sessions.map((s) => {
        const isOpen = expanded === s.id;
        const sessionStepSessions = stepSessions
          .filter((ss) => ss.session_id === s.id)
          .sort((a, b) => (stepById.get(a.step_id)?.step_order ?? 0) - (stepById.get(b.step_id)?.step_order ?? 0));
        const completedCount = sessionStepSessions.filter((ss) => ss.status === "completed").length;

        return (
          <div key={s.id} className="border-b border-slate-100 last:border-0">
            <button
              onClick={() => setExpanded(isOpen ? null : s.id)}
              className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-mono text-xs text-slate-500">{s.id.slice(0, 8)}</span>
              <span className="capitalize text-slate-600">{s.status}</span>
              <span className="capitalize text-slate-400">{s.device_type}</span>
              <span className="text-slate-600">
                {completedCount} of {sessionStepSessions.length} steps
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs">
                <div className="space-y-3">
                  {sessionStepSessions.map((ss) => {
                    const step = stepById.get(ss.step_id);
                    if (!step) return null;
                    const stepEvents = events.filter((e) => e.step_id === step.id && e.session_id === s.id);
                    const path = navigationPath(stepEvents as any, s.id);
                    const stepQuestion = questionsByStep.get(step.id)?.[0];
                    const response = stepQuestion
                      ? responses.find((r) => r.session_id === s.id && r.question_id === stepQuestion.id)
                      : undefined;

                    return (
                      <div key={ss.id} className="rounded-md border border-slate-200 bg-white p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">
                            {step.step_order + 1}. {step.title}
                          </span>
                          <span className="capitalize text-slate-500">{ss.status}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-slate-500">
                          <span>{fmtMs(ss.duration_ms)}</span>
                          <span>{interactionCount(stepEvents as any, s.id)} interactions</span>
                          <span>{unhandledCount(stepEvents as any, s.id)} unhandled</span>
                        </div>
                        {path.length > 0 && (
                          <div className="mt-1.5">
                            <PathVisualization path={path} />
                          </div>
                        )}
                        {response && (
                          <p className="mt-1.5 text-slate-600">
                            <span className="font-semibold text-slate-500">Answer: </span>
                            {response.text_response ?? response.selected_option ?? response.numeric_response ?? "—"}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
