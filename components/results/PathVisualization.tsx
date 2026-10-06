// Renders a navigation path as node cards connected by arrows, instead of
// a raw "123 → 456 → 789" string. Repeated node IDs are highlighted (amber
// ring + badge) as potential backtracking. Deliberately simple — cards in a
// wrapping row, not a graph layout or Sankey diagram.
//
// `labels` is optional: when a caller (A/B results) resolves node IDs to
// human-readable screen names, pass a map and each card shows the name as
// its primary text with the raw node ID as small supporting text beneath.
// Without it (usability call sites), a card shows just the raw node ID,
// exactly as before.
export default function PathVisualization({
  path,
  labels,
}: {
  path: string[];
  labels?: Map<string, string>;
}) {
  if (path.length === 0) {
    return <p className="text-xs text-slate-400">No navigation data yet.</p>;
  }

  const firstIndex = new Map<string, number>();
  path.forEach((node, i) => {
    if (!firstIndex.has(node)) firstIndex.set(node, i);
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {path.map((node, i) => {
        const isRepeat = firstIndex.get(node) !== i;
        const label = labels?.get(node);
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className={`rounded-md border px-2 py-1 text-[11px] ${
                isRepeat
                  ? "border-amber-400 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              title={isRepeat ? `Revisited node — potential backtracking (${node})` : node}
            >
              {label ? (
                <>
                  <span className="font-medium">{label}</span>
                  <span className="ml-1 font-mono text-[9px] text-slate-400">{node}</span>
                </>
              ) : (
                <span className="font-mono">{node}</span>
              )}
              {isRepeat && <span className="ml-1 text-amber-500">↺</span>}
            </div>
            {i < path.length - 1 && <span className="text-slate-300">→</span>}
          </div>
        );
      })}
    </div>
  );
}
