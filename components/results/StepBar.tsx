// Ranked single-series bar chart for N steps — ComparisonBar is A/B-specific
// (always exactly two series) and doesn't fit a variable-length step list.
export default function StepBar({
  items,
  color = "var(--variant-a)",
}: {
  items: { label: string; value: number; display: string }[];
  color?: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-slate-400">No step data yet.</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="text-slate-500">{item.display}</span>
          </div>
          <div className="h-3 rounded-sm bg-slate-100">
            <div
              className="h-3 rounded-sm"
              style={{ width: `${Math.max((item.value / max) * 100, 4)}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
