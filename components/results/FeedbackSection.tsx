"use client";

import { useState } from "react";
import type { AbResponse } from "@/lib/queries";

const COLOR_A = "var(--variant-a)";
const COLOR_B = "var(--variant-b)";

// Participant free-text responses to the optional post-test question,
// grouped into simple tabs. Purely a display of stored data — no analysis
// happens here; the AI Insights section (added separately, on-demand) is
// what turns this into themes/recommendations.
export default function FeedbackSection({ responses }: { responses: AbResponse[] }) {
  const [tab, setTab] = useState<"all" | "a" | "b">("all");

  if (responses.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No post-test question configured, or no responses submitted yet.
      </p>
    );
  }

  const visible = responses.filter((r) => tab === "all" || r.variant === tab);

  return (
    <div>
      <div className="mb-3 flex gap-1">
        {(["all", "a", "b"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              tab === t ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t === "all" ? "All" : `Variant ${t.toUpperCase()}`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-400">No responses for this filter yet.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: r.variant === "a" ? COLOR_A : COLOR_B }}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: r.variant === "a" ? COLOR_A : COLOR_B }}
                  />
                  Variant {r.variant.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">{new Date(r.submitted_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-700">{r.response_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
