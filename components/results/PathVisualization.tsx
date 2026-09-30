// Renders a navigation path as node cards connected by arrows, instead of
// a raw "123 → 456 → 789" string. Repeated node IDs are highlighted (amber
// ring + badge) as potential backtracking. Deliberately simple — cards in a
// wrapping row, not a graph layout or Sankey diagram.
export default function PathVisualization({ path }: { path: string[] }) {
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
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className={`rounded-md border px-2 py-1 font-mono text-[11px] ${
                isRepeat
                  ? "border-amber-400 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              title={isRepeat ? "Revisited node — potential backtracking" : undefined}
            >
              {node}
              {isRepeat && <span className="ml-1 text-amber-500">↺</span>}
            </div>
            {i < path.length - 1 && <span className="text-slate-300">→</span>}
          </div>
        );
      })}
    </div>
  );
}
