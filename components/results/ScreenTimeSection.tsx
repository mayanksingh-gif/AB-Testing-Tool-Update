import type { ScreenTimeStat } from "@/lib/metrics";
import { medianOf, averageOf, fmtMs, fmtPct } from "@/lib/metrics";

// "Time Spent Per Screen" — a ranked list per variant, median as the primary
// metric (a few very slow sessions shouldn't distort the ranking) with
// average shown as secondary, plus a per-screen detail block covering
// visits/participants-reached/backtracking. Screen names come from the
// caller's resolved labels map; falls back to the raw node ID when no name
// could be resolved (matches PathVisualization/InteractionDistribution).
export default function ScreenTimeSection({
  statsA,
  statsB,
  labelsA,
  labelsB,
  participantsA,
  participantsB,
  colorA,
  colorB,
}: {
  statsA: ScreenTimeStat[];
  statsB: ScreenTimeStat[];
  labelsA?: Map<string, string>;
  labelsB?: Map<string, string>;
  participantsA: number;
  participantsB: number;
  colorA: string;
  colorB: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <VariantColumn stats={statsA} labels={labelsA} participants={participantsA} color={colorA} title="Variant A" />
      <VariantColumn stats={statsB} labels={labelsB} participants={participantsB} color={colorB} title="Variant B" />
    </div>
  );
}

function VariantColumn({
  stats,
  labels,
  participants,
  color,
  title,
}: {
  stats: ScreenTimeStat[];
  labels?: Map<string, string>;
  participants: number;
  color: string;
  title: string;
}) {
  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h5 className="mb-2 text-xs font-semibold" style={{ color }}>
          {title}
        </h5>
        <p className="text-xs text-slate-400">Not enough navigation data yet.</p>
      </div>
    );
  }

  const ranked = [...stats].sort((a, b) => (medianOf(b.visitDurationsMs) ?? 0) - (medianOf(a.visitDurationsMs) ?? 0));
  const maxMedian = Math.max(...ranked.map((s) => medianOf(s.visitDurationsMs) ?? 0), 1);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h5 className="mb-2 text-xs font-semibold" style={{ color }}>
        {title}
      </h5>
      <div className="space-y-2.5">
        {ranked.map((s) => {
          const label = labels?.get(s.nodeId) ?? s.nodeId;
          const medianMs = medianOf(s.visitDurationsMs);
          const avgMs = averageOf(s.visitDurationsMs);
          const visitedPct = participants > 0 ? s.sessionsVisited / participants : null;
          const avgVisits = s.sessionsVisited > 0 ? s.visits / s.sessionsVisited : null;
          const revisitPct = s.sessionsVisited > 0 ? s.revisitSessions / s.sessionsVisited : null;

          return (
            <div key={s.nodeId}>
              <div className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-[11px] font-medium text-slate-700" title={s.nodeId}>
                  {label}
                </span>
                <div className="h-3.5 flex-1 rounded-sm bg-slate-100">
                  <div
                    className="h-3.5 rounded-sm"
                    style={{ width: `${Math.max(((medianMs ?? 0) / maxMedian) * 100, 4)}%`, backgroundColor: color }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-medium text-slate-700">{fmtMs(medianMs)}</span>
              </div>
              <p className="mt-0.5 pl-[7.5rem] text-[10px] text-slate-400">
                avg {fmtMs(avgMs)} · visited by {fmtPct(visitedPct)} of participants · {avgVisits?.toFixed(1) ?? "—"}{" "}
                avg visits{revisitPct != null && revisitPct > 0 ? ` · ${fmtPct(revisitPct)} revisited` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
