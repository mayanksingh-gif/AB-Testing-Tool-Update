"use client";

import { useState } from "react";
import type { DeviceType } from "@/lib/usability-queries";

// Reuses TaskBar.tsx's exact bottom-anchored, collapsible mobile/desktop
// pattern, swapping the single task line for "Step X of N" + the current
// step's instruction. A separate component (not a TaskBar prop) so
// TaskBar.tsx stays A/B-only and untouched.
export default function StepProgressBar({
  stepIndex,
  totalSteps,
  instruction,
  deviceType,
}: {
  stepIndex: number;
  totalSteps: number;
  instruction: string;
  deviceType: DeviceType;
}) {
  const [collapsed, setCollapsed] = useState(deviceType === "mobile");
  const label = `Step ${stepIndex + 1} of ${totalSteps}`;

  if (deviceType === "mobile") {
    return (
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex min-h-11 w-full items-center justify-between gap-2 border-t border-white/10 bg-slate-900 px-4 py-2.5 text-left text-white shadow-[0_-4px_12px_rgba(0,0,0,0.25)]"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      >
        <span className={`text-xs ${collapsed ? "truncate" : ""}`}>
          <span className="font-semibold">{label}:</span> {instruction}
        </span>
        <span className="shrink-0 text-xs opacity-70">{collapsed ? "▲" : "▼"}</span>
      </button>
    );
  }

  if (collapsed) {
    return (
      <div className="flex min-h-11 items-center justify-between border-t border-white/10 bg-slate-900 px-3 py-2">
        <span className="text-xs font-medium text-white">{label}</span>
        <button
          onClick={() => setCollapsed(false)}
          className="min-h-9 rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10"
        >
          View instruction
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-t border-white/10 bg-slate-900 px-4 py-2.5">
      <p className="truncate text-sm text-white">
        <span className="font-semibold">{label}:</span> {instruction}
      </p>
      <button
        onClick={() => setCollapsed(true)}
        className="min-h-9 shrink-0 rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10"
      >
        Collapse
      </button>
    </div>
  );
}
