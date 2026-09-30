import type { Insight, Priority } from "@/lib/insights";

const PRIORITY_STYLES: Record<Priority, string> = {
  High: "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function InsightsSection({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Not enough of a data pattern yet to surface insights — check back after more sessions complete.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span
              className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLES[insight.priority]}`}
            >
              {insight.priority} priority
            </span>
          </div>
          <div className="space-y-1.5 text-sm">
            <p>
              <span className="font-semibold text-slate-700">Observation: </span>
              <span className="text-slate-700">{insight.observation}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-700">Possible explanation: </span>
              <span className="text-slate-600">{insight.explanation}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-700">Recommended action: </span>
              <span className="text-slate-600">{insight.action}</span>
            </p>
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-400">
        These are data-driven hypotheses, not statistically validated conclusions — treat priority as a rough triage
        signal, not certainty.
      </p>
    </div>
  );
}
