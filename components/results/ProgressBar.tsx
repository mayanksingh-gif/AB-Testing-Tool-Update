// Target-vs-completed participant progress for one variant. Works correctly
// before the target is reached (percent is clamped at 100% for the fill but
// the raw "x / y" count is always shown) and works even with no target set
// (target == null) by simply showing the completed count without a bar.
export default function ProgressBar({
  variantLabel,
  completed,
  target,
  color,
}: {
  variantLabel: string;
  completed: number;
  target: number | null;
  color: string;
}) {
  const pct = target && target > 0 ? Math.min((completed / target) * 100, 100) : null;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">{variantLabel}</span>
        <span className="text-slate-500">
          {completed} {target != null ? `/ ${target}` : ""} participants
        </span>
      </div>
      {pct != null ? (
        <div className="h-4 rounded-sm bg-slate-100">
          <div
            className="h-4 rounded-sm"
            style={{ width: `${Math.max(pct, completed > 0 ? 4 : 0)}%`, backgroundColor: color }}
          />
        </div>
      ) : (
        <div className="text-xs text-slate-400">No target set — showing raw count only.</div>
      )}
    </div>
  );
}
