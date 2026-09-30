// A single metric compared across Variant A/B as horizontal bars, sized
// relative to the larger of the two values so the difference is visible at a
// glance rather than only readable as text. Follows the dataviz skill's mark
// spec: thin bars (16px), 4px rounded data-ends, a 2px surface gap between
// the two bars, and direct value labels (sparing — one label per bar, not
// per data point).
export default function ComparisonBar({
  label,
  a,
  b,
  aLabel,
  bLabel,
}: {
  label: string;
  a: number | null;
  b: number | null;
  aLabel: string;
  bLabel: string;
}) {
  const max = Math.max(a ?? 0, b ?? 0, 0.0001);
  const widthA = a != null ? Math.max((a / max) * 100, a > 0 ? 4 : 0) : 0;
  const widthB = b != null ? Math.max((b / max) * 100, b > 0 ? 4 : 0) : 0;

  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-slate-600">{label}</div>
      <div className="space-y-2">
        <BarRow name="A" widthPct={widthA} value={aLabel} color="var(--variant-a)" />
        <BarRow name="B" widthPct={widthB} value={bLabel} color="var(--variant-b)" />
      </div>
    </div>
  );
}

function BarRow({ name, widthPct, value, color }: { name: string; widthPct: number; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 shrink-0 text-xs font-semibold text-slate-500">{name}</span>
      <div className="h-4 flex-1 rounded-sm bg-slate-100">
        <div
          className="h-4 rounded-sm"
          style={{ width: `${widthPct}%`, backgroundColor: color, minWidth: widthPct > 0 ? "4px" : 0 }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs font-medium text-slate-700">{value}</span>
    </div>
  );
}
