import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrigin } from "@/lib/origin";
import { getResultsForTest, listAbResponsesForTest } from "@/lib/queries";
import type { EventRow, Session } from "@/lib/queries";
import {
  computeVariantMetrics,
  fmtMs,
  fmtNum,
  fmtPct,
  navigationPath,
  mostCommonPath,
  averageBacktrackingFrequency,
  interactionDistribution,
  timePerScreen,
} from "@/lib/metrics";
import { generateInsights } from "@/lib/insights";
import CopyLinkButton from "@/components/CopyLinkButton";
import SessionList from "@/components/SessionList";
import ResultsFilters from "@/components/results/ResultsFilters";
import ComparisonBar from "@/components/results/ComparisonBar";
import ProgressBar from "@/components/results/ProgressBar";
import StatTile from "@/components/results/StatTile";
import PathVisualization from "@/components/results/PathVisualization";
import InteractionDistribution from "@/components/results/InteractionDistribution";
import InsightsSection from "@/components/results/InsightsSection";
import FeedbackSection from "@/components/results/FeedbackSection";
import AiInsightsSection from "@/components/results/AiInsightsSection";

export const dynamic = "force-dynamic";

const COLOR_A = "var(--variant-a)";
const COLOR_B = "var(--variant-b)";

function applyFilters(
  sessions: Session[],
  events: EventRow[],
  device: string,
  status: string
): { sessions: Session[]; events: EventRow[] } {
  const filteredSessions = sessions.filter((s) => {
    if (device !== "all" && s.device_type !== device) return false;
    if (status === "completed" && s.status !== "completed") return false;
    if (status === "incomplete" && s.status === "completed") return false;
    return true;
  });
  const ids = new Set(filteredSessions.map((s) => s.id));
  const filteredEvents = events.filter((e) => ids.has(e.session_id));
  return { sessions: filteredSessions, events: filteredEvents };
}

export default function ResultsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { variant?: string; device?: string; status?: string };
}) {
  const { test, sessionsA, sessionsB, eventsA, eventsB } = getResultsForTest(params.id);
  if (!test) notFound();
  const abResponses = listAbResponsesForTest(test.id);

  const variantFilter = searchParams.variant ?? "all";
  const deviceFilter = searchParams.device ?? "all";
  const statusFilter = searchParams.status ?? "all";

  const showA = variantFilter !== "b";
  const showB = variantFilter !== "a";

  const filteredA = applyFilters(sessionsA, eventsA, deviceFilter, statusFilter);
  const filteredB = applyFilters(sessionsB, eventsB, deviceFilter, statusFilter);

  const metricsA = computeVariantMetrics(filteredA.sessions, filteredA.events);
  const metricsB = computeVariantMetrics(filteredB.sessions, filteredB.events);

  const origin = getOrigin(headers());
  const linkA = `${origin}/test/${test.id}/a`;
  const linkB = `${origin}/test/${test.id}/b`;

  const pathsA = filteredA.sessions.map((s) => navigationPath(filteredA.events, s.id));
  const pathsB = filteredB.sessions.map((s) => navigationPath(filteredB.events, s.id));
  const commonPathA = mostCommonPath(pathsA);
  const commonPathB = mostCommonPath(pathsB);
  const backtrackA = averageBacktrackingFrequency(pathsA);
  const backtrackB = averageBacktrackingFrequency(pathsB);

  const distributionA = interactionDistribution(filteredA.events);
  const distributionB = interactionDistribution(filteredB.events);

  const screenTimeA = timePerScreen(filteredA.events, filteredA.sessions.map((s) => s.id));
  const screenTimeB = timePerScreen(filteredB.events, filteredB.sessions.map((s) => s.id));

  // Insights are always computed on the unfiltered A/B data — mixing
  // filtered subsets in and out would make "affected participants" counts
  // misleading. Filters affect the visible charts, not the insight engine.
  const insights = generateInsights(
    computeVariantMetrics(sessionsA, eventsA),
    computeVariantMetrics(sessionsB, eventsB),
    sessionsA,
    sessionsB,
    eventsA,
    eventsB
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/tests/${test.id}`}
        className="mb-6 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Back to test
      </Link>
      {/* Header */}
      <h1 className="text-2xl font-semibold text-slate-900">{test.name}</h1>
      <p className="mt-1 text-sm text-slate-600">{test.task}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
          {test.status}
        </span>
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
          {test.device_type} test
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <CopyLinkButton text={linkA} label="Copy Variant A Link" />
        <CopyLinkButton text={linkB} label="Copy Variant B Link" />
      </div>

      <div className="mt-6">
        <Suspense fallback={null}>
          <ResultsFilters />
        </Suspense>
      </div>

      {/* 1. Experiment Overview */}
      <Section title="Experiment Overview">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Participants" a={String(metricsA.participants)} b={String(metricsB.participants)} sampleA={metricsA.participants} sampleB={metricsB.participants} />
          <StatTile label="Completion rate" a={fmtPct(metricsA.completionRate)} b={fmtPct(metricsB.completionRate)} sampleA={metricsA.participants} sampleB={metricsB.participants} />
          <StatTile label="Median task time" a={fmtMs(metricsA.medianDurationMs)} b={fmtMs(metricsB.medianDurationMs)} sampleA={metricsA.participants} sampleB={metricsB.participants} />
          <StatTile label="Avg interactions" a={fmtNum(metricsA.avgInteractions)} b={fmtNum(metricsB.avgInteractions)} sampleA={metricsA.participants} sampleB={metricsB.participants} />
          <StatTile label="Unhandled interactions" a={fmtNum(metricsA.avgUnhandled)} b={fmtNum(metricsB.avgUnhandled)} sampleA={metricsA.participants} sampleB={metricsB.participants} />
          <StatTile label="Screens visited" a={fmtNum(metricsA.avgFramesVisited)} b={fmtNum(metricsB.avgFramesVisited)} sampleA={metricsA.participants} sampleB={metricsB.participants} />
          <StatTile label="Target A" a={String(test.target_a ?? "—")} b={String(test.target_b ?? "—")} sampleA={metricsA.participants} sampleB={metricsB.participants} />
          <StatTile label="Total participants" a={String(metricsA.participants + metricsB.participants)} b="" sampleA={metricsA.participants} sampleB={metricsB.participants} />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Sample sizes: n={metricsA.participants} (A), n={metricsB.participants} (B){deviceFilter !== "all" || statusFilter !== "all" ? " — filtered view" : ""}.
        </p>
      </Section>

      {/* 2. A vs B Performance */}
      <Section title="A vs B Performance">
        <div className="grid gap-6 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <ComparisonBar label="Completion Rate" a={metricsA.completionRate} b={metricsB.completionRate} aLabel={fmtPct(metricsA.completionRate)} bLabel={fmtPct(metricsB.completionRate)} />
          <ComparisonBar
            label="Median Completion Time"
            a={metricsA.medianDurationMs}
            b={metricsB.medianDurationMs}
            aLabel={fmtMs(metricsA.medianDurationMs)}
            bLabel={fmtMs(metricsB.medianDurationMs)}
          />
          <ComparisonBar
            label="Interactions Required"
            a={metricsA.avgInteractions}
            b={metricsB.avgInteractions}
            aLabel={fmtNum(metricsA.avgInteractions)}
            bLabel={fmtNum(metricsB.avgInteractions)}
          />
          <ComparisonBar
            label="Unhandled Interactions"
            a={metricsA.avgUnhandled}
            b={metricsB.avgUnhandled}
            aLabel={fmtNum(metricsA.avgUnhandled)}
            bLabel={fmtNum(metricsB.avgUnhandled)}
          />
        </div>

        <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Participant Progress</h3>
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <ProgressBar variantLabel="A" completed={metricsA.participants} target={test.target_a} color={COLOR_A} />
          <ProgressBar variantLabel="B" completed={metricsB.participants} target={test.target_b} color={COLOR_B} />
        </div>

        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Full metric table</summary>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Metric</th>
                  <th className="px-4 py-3 font-medium">Variant A</th>
                  <th className="px-4 py-3 font-medium">Variant B</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Participants", a: String(metricsA.participants), b: String(metricsB.participants) },
                  { label: "Completed tasks", a: String(metricsA.completed), b: String(metricsB.completed) },
                  { label: "Completion rate", a: fmtPct(metricsA.completionRate), b: fmtPct(metricsB.completionRate) },
                  { label: "Median task duration", a: fmtMs(metricsA.medianDurationMs), b: fmtMs(metricsB.medianDurationMs) },
                  { label: "Average task duration", a: fmtMs(metricsA.avgDurationMs), b: fmtMs(metricsB.avgDurationMs) },
                  { label: "Average interactions/clicks", a: fmtNum(metricsA.avgInteractions), b: fmtNum(metricsB.avgInteractions) },
                  { label: "Average unhandled interactions", a: fmtNum(metricsA.avgUnhandled), b: fmtNum(metricsB.avgUnhandled) },
                  { label: "Average frames/screens visited", a: fmtNum(metricsA.avgFramesVisited), b: fmtNum(metricsB.avgFramesVisited) },
                  { label: "Average time to first interaction", a: fmtMs(metricsA.avgTimeToFirstInteractionMs), b: fmtMs(metricsB.avgTimeToFirstInteractionMs) },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-700">{row.label}</td>
                    <td className="px-4 py-3 text-slate-900">{row.a}</td>
                    <td className="px-4 py-3 text-slate-900">{row.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>

      {/* 3. Participant Journey */}
      <Section title="Participant Journey">
        <div className="grid gap-4 sm:grid-cols-2">
          {showA && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="mb-2 text-sm font-semibold" style={{ color: COLOR_A }}>
                Most common path — Variant A
              </h4>
              {commonPathA ? (
                <>
                  <PathVisualization path={commonPathA.path} />
                  <p className="mt-2 text-xs text-slate-400">
                    Seen in {commonPathA.count} of {filteredA.sessions.length} sessions.
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400">No navigation data yet.</p>
              )}
            </div>
          )}
          {showB && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="mb-2 text-sm font-semibold" style={{ color: COLOR_B }}>
                Most common path — Variant B
              </h4>
              {commonPathB ? (
                <>
                  <PathVisualization path={commonPathB.path} />
                  <p className="mt-2 text-xs text-slate-400">
                    Seen in {commonPathB.count} of {filteredB.sessions.length} sessions.
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400">No navigation data yet.</p>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Avg screens visited" a={fmtNum(metricsA.avgFramesVisited)} b={fmtNum(metricsB.avgFramesVisited)} sampleA={metricsA.participants} sampleB={metricsB.participants} />
          <StatTile label="Backtracking frequency" a={fmtNum(backtrackA)} b={fmtNum(backtrackB)} sampleA={metricsA.participants} sampleB={metricsB.participants} />
        </div>
      </Section>

      {/* 4. Interaction Analysis */}
      <Section title="Interaction Analysis">
        <div className="grid gap-4 sm:grid-cols-2">
          {showA && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="mb-2 text-sm font-semibold" style={{ color: COLOR_A }}>
                Variant A
              </h4>
              <InteractionDistribution data={distributionA} color={COLOR_A} />
            </div>
          )}
          {showB && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="mb-2 text-sm font-semibold" style={{ color: COLOR_B }}>
                Variant B
              </h4>
              <InteractionDistribution data={distributionB} color={COLOR_B} />
            </div>
          )}
        </div>
      </Section>

      {/* 5. Friction Signals (Time Analysis) */}
      <Section title="Friction Signals">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Time to first interaction"
            a={fmtMs(metricsA.avgTimeToFirstInteractionMs)}
            b={fmtMs(metricsB.avgTimeToFirstInteractionMs)}
            sampleA={metricsA.participants}
            sampleB={metricsB.participants}
          />
          <StatTile label="Median completion time" a={fmtMs(metricsA.medianDurationMs)} b={fmtMs(metricsB.medianDurationMs)} sampleA={metricsA.participants} sampleB={metricsB.participants} />
        </div>
        <h4 className="mb-2 mt-4 text-sm font-semibold text-slate-900">Time spent per screen (where derivable)</h4>
        <p className="mb-3 text-xs text-slate-500">
          Longer dwell time on a screen before moving to the next one may indicate a point where participants hesitate.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {showA && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h5 className="mb-2 text-xs font-semibold" style={{ color: COLOR_A }}>
                Variant A
              </h5>
              {screenTimeA.length > 0 ? (
                <InteractionDistribution
                  data={screenTimeA.map((s) => ({ nodeId: s.nodeId, count: Math.round(s.avgMs / 1000) }))}
                  color={COLOR_A}
                />
              ) : (
                <p className="text-xs text-slate-400">Not enough multi-screen sessions yet.</p>
              )}
              {screenTimeA.length > 0 && <p className="mt-1 text-[11px] text-slate-400">Values are average seconds spent before moving on.</p>}
            </div>
          )}
          {showB && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h5 className="mb-2 text-xs font-semibold" style={{ color: COLOR_B }}>
                Variant B
              </h5>
              {screenTimeB.length > 0 ? (
                <InteractionDistribution
                  data={screenTimeB.map((s) => ({ nodeId: s.nodeId, count: Math.round(s.avgMs / 1000) }))}
                  color={COLOR_B}
                />
              ) : (
                <p className="text-xs text-slate-400">Not enough multi-screen sessions yet.</p>
              )}
              {screenTimeB.length > 0 && <p className="mt-1 text-[11px] text-slate-400">Values are average seconds spent before moving on.</p>}
            </div>
          )}
        </div>
      </Section>

      {/* 6. Actionable Insights */}
      <Section title="Actionable Insights">
        <InsightsSection insights={insights} />
      </Section>

      {/* 6b. Participant Feedback (post-test question responses) */}
      <Section title="Participant Feedback">
        <FeedbackSection responses={abResponses} />
      </Section>

      {/* 6c. AI Insights (on-demand, local Qwen) */}
      <Section title="AI Insights">
        <AiInsightsSection subjectType="ab" subjectId={test.id} />
      </Section>

      {/* 7. Individual Sessions */}
      <Section title="Individual Sessions">
        <div className="space-y-8">
          {showA && <SessionList title="Variant A Sessions" sessions={filteredA.sessions} events={filteredA.events} />}
          {showB && <SessionList title="Variant B Sessions" sessions={filteredB.sessions} events={filteredB.events} />}
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
