"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Simple, non-complex filters: Variant (All/A/B), Device (All/Desktop/
// Mobile), Status (All/Completed/Incomplete). Reflected in the URL query
// string so the results page (a server component) can filter server-side
// and the filtered view is shareable/bookmarkable.
export default function ResultsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const variant = searchParams.get("variant") ?? "all";
  const device = searchParams.get("device") ?? "all";
  const status = searchParams.get("status") ?? "all";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-white p-3">
      <FilterGroup label="Variant" value={variant} options={["all", "a", "b"]} labels={["All", "A", "B"]} onChange={(v) => setParam("variant", v)} />
      <FilterGroup
        label="Device"
        value={device}
        options={["all", "desktop", "mobile"]}
        labels={["All", "Desktop", "Mobile"]}
        onChange={(v) => setParam("device", v)}
      />
      <FilterGroup
        label="Status"
        value={status}
        options={["all", "completed", "incomplete"]}
        labels={["All", "Completed", "Incomplete"]}
        onChange={(v) => setParam("status", v)}
      />
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase text-slate-400">{label}</div>
      <div className="flex gap-1">
        {options.map((opt, i) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              value === opt ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {labels[i]}
          </button>
        ))}
      </div>
    </div>
  );
}
