export default function StatTile({
  label,
  a,
  b,
  sampleA,
  sampleB,
}: {
  label: string;
  a: string;
  b: string;
  sampleA: number;
  sampleB: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-3">
        <span className="text-sm font-semibold" style={{ color: "var(--variant-a)" }}>
          A {a}
        </span>
        <span className="text-sm font-semibold" style={{ color: "var(--variant-b)" }}>
          B {b}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-slate-400">
        n={sampleA} / n={sampleB}
      </div>
    </div>
  );
}
