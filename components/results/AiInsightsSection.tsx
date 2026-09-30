"use client";

import { useEffect, useState } from "react";
import { generateAbInsightsAction, getCachedAiInsightsAction } from "@/lib/actions";
import type { AiInsightsReport } from "@/lib/ai-insights";

// On-demand only — never runs automatically. Mirrors InsightsSection.tsx's
// visual language, but adds an explicit Observation / Interpretation /
// Recommendation split per finding, since this content comes from a model
// rather than a deterministic rule, and readers need to be able to tell
// "what happened" apart from "what the model thinks it means."
export default function AiInsightsSection({
  subjectType,
  subjectId,
  generateUsabilityAction,
}: {
  subjectType: "ab" | "usability";
  subjectId: string;
  // Usability results pages pass their own server action here (same shape
  // as generateAbInsightsAction) so this component stays shared across both
  // study types without importing usability-only code into the A/B bundle.
  generateUsabilityAction?: (studyId: string) => Promise<
    { ok: true; report: AiInsightsReport } | { ok: false; error: string }
  >;
}) {
  const [report, setReport] = useState<AiInsightsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedCache, setCheckedCache] = useState(false);

  useEffect(() => {
    let active = true;
    getCachedAiInsightsAction(subjectType, subjectId).then((cached) => {
      if (active && cached) setReport(cached);
      if (active) setCheckedCache(true);
    });
    return () => {
      active = false;
    };
  }, [subjectType, subjectId]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const result =
      subjectType === "usability" && generateUsabilityAction
        ? await generateUsabilityAction(subjectId)
        : await generateAbInsightsAction(subjectId);
    setLoading(false);
    if (result.ok) {
      setReport(result.report);
    } else {
      setError(result.error);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Generated on demand by a local AI model, from the same metrics and feedback shown above. Always
          double-check against the raw data before acting on it.
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Generating…" : report ? "Refresh Insights" : "Generate AI Insights"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error} Local AI insights require the local model server to be running and reachable.
        </div>
      )}

      {!error && !report && checkedCache && !loading && (
        <p className="text-sm text-slate-400">No AI insights generated yet.</p>
      )}

      {report && (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Executive summary</h4>
            <p className="text-sm text-slate-700">{report.executiveSummary}</p>
            <p className="mt-2 text-[11px] text-slate-400">
              Generated {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>

          <FindingGroup title="Key findings" findings={report.keyFindings} />
          <FindingGroup title="Behavioral patterns" findings={report.behavioralPatterns} />
          <FindingGroup title="Feedback themes" findings={report.feedbackThemes} />
          <FindingGroup title="Possible explanations" findings={report.possibleExplanations} />

          {report.highestFrictionSteps && report.highestFrictionSteps.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Highest-friction steps</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                {report.highestFrictionSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {report.recommendations.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Recommendations</h4>
              <div className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-900">{r.recommendation}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-500">Rationale: </span>
                      {r.rationale}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      <span className="font-semibold">Evidence: </span>
                      {r.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.recommendedNextTests.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Ideas for follow-up tests</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                {report.recommendedNextTests.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
            AI-generated content is a starting point for discussion, not a finding of fact. It may misread the
            data — treat every claim above as a hypothesis to verify, not a conclusion.
          </p>
        </div>
      )}
    </div>
  );
}

function FindingGroup({
  title,
  findings,
}: {
  title: string;
  findings: { observation: string; interpretation: string; evidence: string }[];
}) {
  if (findings.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-slate-900">{title}</h4>
      <div className="space-y-2">
        {findings.map((f, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-800">
              <span className="font-semibold text-slate-500">Observation: </span>
              {f.observation}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-semibold text-slate-500">Interpretation: </span>
              {f.interpretation}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              <span className="font-semibold">Evidence: </span>
              {f.evidence}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
