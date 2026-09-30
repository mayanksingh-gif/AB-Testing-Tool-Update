import type { NodeInteraction } from "@/lib/metrics";

// Horizontal bar-per-node interaction counts. No human-readable layer names
// are available from the Figma Embed API payloads this app stores, so nodes
// always render as their raw IDs (e.g. "131:44") — this is expected, not a
// missing-data bug.
export default function InteractionDistribution({
  data,
  color,
}: {
  data: NodeInteraction[];
  color: string;
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
          <span className="w-24 shrink-0 truncate font-mono text-[11px] text-slate-500" title={d.nodeId}>
            {d.nodeId}
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
