// Converts already-computed metrics into cautiously-worded UX research
// observations. This is pattern-matching over numbers already derived in
// metrics.ts — no AI, no statistical significance testing, no claims about
// user intent. Every insight is phrased as a hypothesis worth investigating,
// never a certainty.
import type { EventRow, Session } from "./queries";
import {
  averageBacktrackingFrequency,
  mostCommonPath,
  navigationPath,
  type VariantMetrics,
} from "./metrics";

export type Priority = "High" | "Medium" | "Low";

export interface Insight {
  observation: string;
  explanation: string;
  action: string;
  priority: Priority;
}

function pctDiff(a: number, b: number): number {
  if (a === 0) return b === 0 ? 0 : 1;
  return (b - a) / Math.abs(a);
}

// Priority weighs: how many participants are affected (frequency), whether
// completion is impacted, and how much extra time/effort is implied — never
// treated as statistical certainty, only as a rough triage signal.
function priorityFor(affected: number, relativeDelta: number, impactsCompletion: boolean): Priority {
  const magnitude = Math.abs(relativeDelta);
  if (impactsCompletion && affected >= 3 && magnitude >= 0.25) return "High";
  if (affected >= 2 && magnitude >= 0.15) return "Medium";
  return "Low";
}

export function generateInsights(
  metricsA: VariantMetrics,
  metricsB: VariantMetrics,
  sessionsA: Session[],
  sessionsB: Session[],
  eventsA: EventRow[],
  eventsB: EventRow[]
): Insight[] {
  const insights: Insight[] = [];

  // 1. Completion rate gap
  if (metricsA.completionRate != null && metricsB.completionRate != null) {
    const delta = metricsA.completionRate - metricsB.completionRate;
    if (Math.abs(delta) >= 0.15 && (metricsA.participants >= 3 || metricsB.participants >= 3)) {
      const better = delta > 0 ? "A" : "B";
      const worse = delta > 0 ? "B" : "A";
      const affected = delta > 0 ? metricsB.participants : metricsA.participants;
      insights.push({
        observation: `Variant ${worse} had a lower completion rate than Variant ${better} (${Math.round(
          (delta > 0 ? metricsB.completionRate! : metricsA.completionRate!) * 100
        )}% vs ${Math.round((delta > 0 ? metricsA.completionRate! : metricsB.completionRate!) * 100)}%).`,
        explanation: `This gap may indicate that something in Variant ${worse}'s flow is harder to complete, though small sample sizes could also explain part of the difference.`,
        action: `Worth investigating the screens where Variant ${worse} sessions most often stopped or were abandoned before completion.`,
        priority: priorityFor(affected, delta, true),
      });
    }
  }

  // 2. Interactions-required gap (more clicks may suggest friction)
  if (metricsA.avgInteractions != null && metricsB.avgInteractions != null) {
    const delta = pctDiff(metricsA.avgInteractions, metricsB.avgInteractions);
    if (Math.abs(delta) >= 0.25) {
      const higher = delta > 0 ? "B" : "A";
      const lower = delta > 0 ? "A" : "B";
      insights.push({
        observation: `Participants using Variant ${higher} required more interactions on average to work through the task than Variant ${lower} (${(
          delta > 0 ? metricsB.avgInteractions : metricsA.avgInteractions
        )!.toFixed(1)} vs ${(delta > 0 ? metricsA.avgInteractions : metricsB.avgInteractions)!.toFixed(1)}).`,
        explanation: `A higher interaction count could suggest the interface in Variant ${higher} requires more effort or trial-and-error to accomplish the same task.`,
        action: `Consider reviewing Variant ${higher}'s key screens for unclear affordances or unnecessary steps.`,
        priority: priorityFor(
          Math.max(metricsA.participants, metricsB.participants),
          delta,
          false
        ),
      });
    }
  }

  // 3. Unhandled interactions (misclicks on non-interactive areas)
  if (metricsA.avgUnhandled != null && metricsB.avgUnhandled != null) {
    const delta = pctDiff(metricsA.avgUnhandled, metricsB.avgUnhandled);
    if (Math.abs(delta) >= 0.3 && Math.max(metricsA.avgUnhandled, metricsB.avgUnhandled) >= 0.5) {
      const higher = delta > 0 ? "B" : "A";
      insights.push({
        observation: `Variant ${higher} had a higher average number of unhandled interactions (clicks/taps that didn't trigger a prototype response) than the other variant.`,
        explanation: `Frequent unhandled interactions may indicate participants are clicking on elements that look interactive but aren't wired up in the prototype, which could point to a discoverability or affordance issue worth investigating.`,
        action: `Review which nodes in Variant ${higher} receive unhandled clicks most often and consider whether those elements need clearer visual treatment or missing interactivity.`,
        priority: priorityFor(
          Math.max(metricsA.participants, metricsB.participants),
          delta,
          false
        ),
      });
    }
  }

  // 4. Backtracking frequency
  const pathsA = sessionsA.map((s) => navigationPath(eventsA, s.id));
  const pathsB = sessionsB.map((s) => navigationPath(eventsB, s.id));
  const backtrackA = averageBacktrackingFrequency(pathsA);
  const backtrackB = averageBacktrackingFrequency(pathsB);
  if (backtrackA != null && backtrackB != null && (backtrackA > 0 || backtrackB > 0)) {
    const delta = pctDiff(backtrackA || 0.01, backtrackB || 0.01);
    if (Math.abs(delta) >= 0.5) {
      const higher = delta > 0 ? "B" : "A";
      const higherVal = higher === "A" ? backtrackA : backtrackB;
      insights.push({
        observation: `Participants using Variant ${higher} revisited the same screen more often than the other variant (average of ${higherVal.toFixed(
          1
        )} repeated screen visits per session).`,
        explanation: `Repeated visits to the same screen may indicate participants are backtracking to re-orient themselves, which could suggest the path forward from that screen isn't sufficiently clear.`,
        action: `Look at which screen is most frequently revisited in Variant ${higher} and consider testing stronger next-step cues there.`,
        priority: priorityFor(
          higher === "A" ? metricsA.participants : metricsB.participants,
          delta,
          false
        ),
      });
    }
  }

  // 5. Most-common-path node repetition (mirrors the example in the spec —
  // a specific screen appearing more than once in the most common path)
  for (const [label, sessions, events] of [
    ["A", sessionsA, eventsA],
    ["B", sessionsB, eventsB],
  ] as const) {
    const paths = sessions.map((s) => navigationPath(events, s.id));
    const common = mostCommonPath(paths);
    if (!common || common.path.length === 0) continue;
    const seen = new Map<string, number>();
    for (const node of common.path) seen.set(node, (seen.get(node) ?? 0) + 1);
    const repeated = [...seen.entries()].find(([, count]) => count >= 2);
    if (repeated && sessions.length >= 3) {
      insights.push({
        observation: `In Variant ${label}'s most common path, screen "${repeated[0]}" was visited ${repeated[1]} times before the task ended.`,
        explanation: `Visiting the same screen multiple times within a single path may indicate that screen isn't sufficiently discoverable or clear on the first pass.`,
        action: `Test whether a stronger call-to-action or clearer hierarchy on that screen reduces repeat visits.`,
        priority: priorityFor(sessions.length, repeated[1] / common.path.length, false),
      });
    }
  }

  // 6. Time-to-first-interaction gap (slow start may indicate confusion at load)
  if (metricsA.avgTimeToFirstInteractionMs != null && metricsB.avgTimeToFirstInteractionMs != null) {
    const delta = pctDiff(metricsA.avgTimeToFirstInteractionMs, metricsB.avgTimeToFirstInteractionMs);
    if (Math.abs(delta) >= 0.4 && Math.max(metricsA.avgTimeToFirstInteractionMs, metricsB.avgTimeToFirstInteractionMs) >= 2000) {
      const slower = delta > 0 ? "B" : "A";
      insights.push({
        observation: `Participants took longer to make their first interaction on Variant ${slower} than on the other variant.`,
        explanation: `A slower first interaction could suggest the entry screen takes longer to orient to, though it may also simply reflect a more content-heavy first screen.`,
        action: `Worth investigating whether the initial screen in Variant ${slower} communicates the next step clearly enough.`,
        priority: priorityFor(
          Math.max(metricsA.participants, metricsB.participants),
          delta,
          false
        ),
      });
    }
  }

  const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
  return insights.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}
