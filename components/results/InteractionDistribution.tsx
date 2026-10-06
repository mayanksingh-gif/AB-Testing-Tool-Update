import type { NodeInteraction } from "@/lib/metrics";

// Horizontal bar-per-node interaction counts. `labels` is optional: when the
// caller has resolved node IDs to human-readable screen names (A/B results),
// pass a map and bars show the name, with the raw node ID kept as the hover
// title. Without it (or for a node with no resolved name), falls back to the
// raw ID as before.
export default function InteractionDistribution({
  data,
  color,
  labels,
}: {
  data: NodeInteraction[];
  color: string;
  labels?: Map<string, string>;
}) {
  if (data.length === 0) {
    return <p className="text-xs text-slate-400">No interaction data yet.</p>;
  }
  const top = data.slice(0, 8);
  const max = Math.max(...top.map((d) => d.count), 1);

  return (
    <div className="space-y-1.5">
      {top.map((d) => (
        <div key={d.nodeId} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-[11px] text-slate-500" title={d.nodeId}>
            {labels?.get(d.nodeId) ?? d.nodeId}
          </span>
          <div className="h-3.5 flex-1 rounded-sm bg-slate-100">
            <div
              className="h-3.5 rounded-sm"
              style={{ width: `${Math.max((d.count / max) * 100, 4)}%`, backgroundColor: color }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-medium text-slate-700">{d.count}</span>
        </div>
      ))}
    </div>
  );
}
