"use client";

import { useState } from "react";
import type { DeviceType } from "@/lib/queries";

// Anchored to the BOTTOM of the participant screen (see ParticipantExperience),
// below the Figma embed. Kept out of the top of the screen so it never crowds
// the prototype's own UI chrome (status bar, nav bar, etc. rendered by the
// design itself), which is what caused the cramped look at the top before.
export default function TaskBar({ task, deviceType }: { task: string; deviceType: DeviceType }) {
  const [collapsed, setCollapsed] = useState(deviceType === "mobile");

  if (deviceType === "mobile") {
    return (
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex min-h-11 w-full items-center justify-between gap-2 border-t border-white/10 bg-slate-900 px-4 py-2.5 text-left text-white shadow-[0_-4px_12px_rgba(0,0,0,0.25)]"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      >
        <span className={`text-xs ${collapsed ? "truncate" : ""}`}>
          <span className="font-semibold">Task:</span> {task}
        </span>
        <span className="shrink-0 text-xs opacity-70">{collapsed ? "▲" : "▼"}</span>
      </button>
    );
  }

  if (collapsed) {
    return (
      <div className="flex min-h-11 items-center border-t border-white/10 bg-slate-900 px-3 py-2">
        <button
          onClick={() => setCollapsed(false)}
          className="min-h-9 rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10"
        >
          View task
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-t border-white/10 bg-slate-900 px-4 py-2.5">
      <p className="truncate text-sm text-white">
        <span className="font-semibold">Task:</span> {task}
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
