import type { FrictionRankedStep } from "@/lib/usability-metrics";
import { fmtPct } from "@/lib/usability-metrics";

// A weighted heuristic ranking, explicitly labeled "Friction indicator" — the
// same disclaimer tone as InsightsSection.tsx. Never implies statistical
// certainty; it's a place to start looking, not a verdict.
export default function FrictionRanking({ steps }: { steps: FrictionRankedStep[] }) {
  if (steps.length === 0) {
    return <p className="text-xs text-slate-400">No step data yet.</p>;
  }
  const max = Math.max(...steps.map((s) => s.frictionScore), 1);

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Friction indicator — a weighted combination of drop-off, unhandled clicks, and backtracking. Higher scores
        are worth a closer look, not proof of a problem.
      </p>
      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.stepId} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">{s.title}</span>
              <span className="text-xs font-semibold text-slate-500">{s.frictionScore.toFixed(1)}</span>
            </div>
            <div className="h-2.5 rounded-sm bg-slate-100">
              <div
                className="h-2.5 rounded-sm bg-amber-500"
                style={{ width: `${Math.max((s.frictionScore / max) * 100, 4)}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-400">
              <span>Completion: {fmtPct(s.completionRate)}</span>
              <span>Avg unhandled: {s.avgUnhandled != null ? s.avgUnhandled.toFixed(1) : "—"}</span>
              <span>Avg backtracking: {s.avgBacktracking != null ? s.avgBacktracking.toFixed(1) : "—"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
