import type { EventRow, Session } from "./queries";

export interface VariantMetrics {
  participants: number;
  completed: number;
  completionRate: number | null; // 0..1
  medianDurationMs: number | null;
  avgDurationMs: number | null;
  avgInteractions: number | null;
  avgUnhandled: number | null;
  avgFramesVisited: number | null;
  avgTimeToFirstInteractionMs: number | null;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// All metrics are calculated programmatically from stored sessions/events.
// No AI is involved in analytics.
export function computeVariantMetrics(sessions: Session[], events: EventRow[]): VariantMetrics {
  const participants = sessions.length;
  const completed = sessions.filter((s) => s.status === "completed").length;
  const completionRate = participants > 0 ? completed / participants : null;

  const durations = sessions.map((s) => s.duration_ms).filter((d): d is number => d != null);

  const eventsBySession = new Map<string, EventRow[]>();
  for (const e of events) {
    if (!eventsBySession.has(e.session_id)) eventsBySession.set(e.session_id, []);
    eventsBySession.get(e.session_id)!.push(e);
  }

  const interactionCounts: number[] = [];
  const unhandledCounts: number[] = [];
  const frameCounts: number[] = [];
  const firstInteractionTimes: number[] = [];

  for (const session of sessions) {
    const sessionEvents = eventsBySession.get(session.id) ?? [];
    const interactions = sessionEvents.filter((e) => e.event_type === "MOUSE_PRESS_OR_RELEASE");
    interactionCounts.push(interactions.length);
    unhandledCounts.push(sessionEvents.filter((e) => e.handled === 0).length);
    frameCounts.push(sessionEvents.filter((e) => e.event_type === "PRESENTED_NODE_CHANGED").length);

    const firstInteraction = interactions
      .filter((e) => e.elapsed_ms != null)
      .sort((a, b) => (a.elapsed_ms ?? 0) - (b.elapsed_ms ?? 0))[0];
    if (firstInteraction?.elapsed_ms != null) {
      firstInteractionTimes.push(firstInteraction.elapsed_ms);
    }
  }

  return {
    participants,
    completed,
    completionRate,
    medianDurationMs: median(durations),
    avgDurationMs: average(durations),
    avgInteractions: participants > 0 ? average(interactionCounts) : null,
    avgUnhandled: participants > 0 ? average(unhandledCounts) : null,
    avgFramesVisited: participants > 0 ? average(frameCounts) : null,
    avgTimeToFirstInteractionMs: average(firstInteractionTimes),
  };
}

// Ordered sequence of presented node IDs for one session — the simple
// "navigation path" (e.g. 112:4 → 231:8 → 395:3).
export function navigationPath(events: EventRow[], sessionId: string): string[] {
  return events
    .filter((e) => e.session_id === sessionId && e.event_type === "PRESENTED_NODE_CHANGED")
    .sort((a, b) => (a.elapsed_ms ?? 0) - (b.elapsed_ms ?? 0))
    .map((e) => e.presented_node_id ?? "unknown");
}

export function interactionCount(events: EventRow[], sessionId: string): number {
  return events.filter((e) => e.session_id === sessionId && e.event_type === "MOUSE_PRESS_OR_RELEASE").length;
}

export function unhandledCount(events: EventRow[], sessionId: string): number {
  return events.filter((e) => e.session_id === sessionId && e.handled === 0).length;
}

export function framesVisitedCount(events: EventRow[], sessionId: string): number {
  return events.filter((e) => e.session_id === sessionId && e.event_type === "PRESENTED_NODE_CHANGED").length;
}

// ---------- path / backtracking / interaction-distribution / time-per-screen ----------
// All derived from the existing sessions/events rows already stored — no new
// tracking, no AI, no estimation.

// Repeated (non-consecutive-only) node visits within a path count as
// backtracking — e.g. Home → Cart → Product → Cart revisits Cart once.
export function backtrackingCount(path: string[]): number {
  const seen = new Map<string, number>();
  let repeats = 0;
  for (const node of path) {
    const count = (seen.get(node) ?? 0) + 1;
    seen.set(node, count);
    if (count > 1) repeats++;
  }
  return repeats;
}

export function hasBacktracking(path: string[]): boolean {
  return backtrackingCount(path) > 0;
}

// The most frequently occurring exact path across a variant's sessions.
// Falls back to null when there isn't enough path data to be meaningful.
export function mostCommonPath(paths: string[][]): { path: string[]; count: number } | null {
  const nonEmpty = paths.filter((p) => p.length > 0);
  if (nonEmpty.length === 0) return null;
  const counts = new Map<string, { path: string[]; count: number }>();
  for (const path of nonEmpty) {
    const key = path.join("|");
    const entry = counts.get(key);
    if (entry) entry.count++;
    else counts.set(key, { path, count: 1 });
  }
  let best: { path: string[]; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best;
}

export function averageBacktrackingFrequency(paths: string[][]): number | null {
  if (paths.length === 0) return null;
  return average(paths.map(backtrackingCount));
}

export interface NodeInteraction {
  nodeId: string;
  count: number;
}

// Interaction counts grouped by prototype node (the node a click/tap landed
// on). No human-readable layer names are available from the Figma Embed API
// payloads this app stores, so nodes are always shown as raw IDs.
export function interactionDistribution(events: EventRow[]): NodeInteraction[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.event_type !== "MOUSE_PRESS_OR_RELEASE") continue;
    const nodeId = e.presented_node_id ?? e.target_node_id ?? "unknown";
    counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([nodeId, count]) => ({ nodeId, count }))
    .sort((a, b) => b.count - a.count);
}

export interface ScreenTime {
  nodeId: string;
  avgMs: number;
  visits: number;
}

// Average dwell time on each screen/node, derived from the gap between
// consecutive PRESENTED_NODE_CHANGED events within a session. The final
// screen of a session has no "next" event to close the interval, so it's
// excluded — this measures time spent before moving on, not final-screen time.
export function timePerScreen(events: EventRow[], sessionIds: string[]): ScreenTime[] {
  const totals = new Map<string, { totalMs: number; visits: number }>();
  for (const sessionId of sessionIds) {
    const changes = events
      .filter((e) => e.session_id === sessionId && e.event_type === "PRESENTED_NODE_CHANGED")
      .sort((a, b) => (a.elapsed_ms ?? 0) - (b.elapsed_ms ?? 0));
    for (let i = 0; i < changes.length - 1; i++) {
      const nodeId = changes[i].presented_node_id ?? "unknown";
      const dwellMs = (changes[i + 1].elapsed_ms ?? 0) - (changes[i].elapsed_ms ?? 0);
      if (dwellMs < 0) continue;
      const entry = totals.get(nodeId) ?? { totalMs: 0, visits: 0 };
      entry.totalMs += dwellMs;
      entry.visits += 1;
      totals.set(nodeId, entry);
    }
  }
  return [...totals.entries()]
    .map(([nodeId, { totalMs, visits }]) => ({ nodeId, avgMs: totalMs / visits, visits }))
    .sort((a, b) => b.avgMs - a.avgMs);
}

export function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

export function fmtPct(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export function fmtNum(n: number | null): string {
  if (n == null) return "—";
  return n.toFixed(1);
}
