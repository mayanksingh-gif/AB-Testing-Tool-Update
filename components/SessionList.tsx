"use client";

import { useState } from "react";
import type { EventRow, Session } from "@/lib/queries";
import { framesVisitedCount, interactionCount, navigationPath, unhandledCount } from "@/lib/metrics";
import PathVisualization from "./results/PathVisualization";

function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

function buildTimeline(session: Session, events: EventRow[]): string[] {
  const sessionEvents = events
    .filter((e) => e.session_id === session.id)
    .sort((a, b) => (a.elapsed_ms ?? 0) - (b.elapsed_ms ?? 0));

  const lines: string[] = ["0.0s — Task started"];
  let seenInteraction = false;

  for (const e of sessionEvents) {
    const t = e.elapsed_ms != null ? (e.elapsed_ms / 1000).toFixed(1) : "?";
    let label: string;
    switch (e.event_type) {
      case "INITIAL_LOAD":
        label = "Prototype loaded";
        break;
      case "MOUSE_PRESS_OR_RELEASE":
        label = seenInteraction ? "Mouse interaction" : "First interaction";
        if (e.handled === 0) label += " (unhandled)";
        seenInteraction = true;
        break;
      case "PRESENTED_NODE_CHANGED":
        label = `Frame changed → ${e.presented_node_id ?? "unknown"}`;
        break;
      case "NEW_STATE":
        label = "State changed";
        break;
      default:
        label = e.event_type;
    }
    lines.push(`${t}s — ${label}`);
  }

  if (session.status === "completed") {
    lines.push(`${fmtMs(session.duration_ms)} — Task completed`);
  }

  return lines;
}

export default function SessionList({
  title,
  sessions,
  events,
}: {
  title: string;
  sessions: Session[];
  events: EventRow[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      {sessions.length === 0 ? (
        <p className="text-sm text-slate-400">No sessions yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {sessions.map((s) => {
            const isOpen = expanded === s.id;
            const path = navigationPath(events, s.id);
            return (
              <div key={s.id} className="border-b border-slate-100 last:border-0">
                <button
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-mono text-xs text-slate-500">{s.id.slice(0, 8)}</span>
                  <span className="capitalize text-slate-600">{s.status}</span>
                  <span className="capitalize text-slate-400">{s.device_type}</span>
                  <span className="text-slate-600">{fmtMs(s.duration_ms)}</span>
                  <span className="text-slate-600">{interactionCount(events, s.id)} interactions</span>
                  <span className="text-slate-600">{unhandledCount(events, s.id)} unhandled</span>
                  <span className="text-slate-600">{framesVisitedCount(events, s.id)} frames</span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs">
                    <div className="mb-2">
                      <div className="mb-1 font-semibold text-slate-700">Navigation path</div>
                      {path.length > 0 ? <PathVisualization path={path} /> : <div className="text-slate-600">—</div>}
                    </div>
                    <div>
                      <div className="mb-1 font-semibold text-slate-700">Timeline</div>
                      <div className="space-y-0.5 text-slate-600">
                        {buildTimeline(s, events).map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
