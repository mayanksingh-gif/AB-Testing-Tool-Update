import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getResultsForUsabilityStudy } from "@/lib/usability-queries";
import { computeUsabilityOverview, computeStepAnalysis, rankFrictionSteps, summarizeQuestions, fmtMs, fmtPct } from "@/lib/usability-metrics";
import { generateUsabilityInsightsAction } from "@/lib/usability-actions";
import StatTile from "@/components/results/StatTile";
import StepBar from "@/components/results/StepBar";
import FrictionRanking from "@/components/results/FrictionRanking";
import QuestionAnalysis from "@/components/results/QuestionAnalysis";
import UsabilitySessionList from "@/components/UsabilitySessionList";
import AiInsightsSection from "@/components/results/AiInsightsSection";
import FinalStudyFeedback from "@/components/results/FinalStudyFeedback";

export const dynamic = "force-dynamic";

export default function UsabilityResultsPage({ params }: { params: { id: string } }) {
  const { study, steps, questions, sessions, stepSessions, responses, events, studyResponses } =
    getResultsForUsabilityStudy(params.id);
  if (!study) notFound();

  const overview = computeUsabilityOverview(sessions, stepSessions, steps);
  const perStep = computeStepAnalysis(steps, stepSessions, events);
  const frictionRanking = rankFrictionSteps(perStep);
  const questionSummaries = summarizeQuestions(questions, responses);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/studies/${study.id}`}
        className="mb-6 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Back to study
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">{study.name}</h1>
      {study.description && <p className="mt-1 text-sm text-slate-600">{study.description}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
          {study.status}
        </span>
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
          {study.device_type}
        </span>
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {steps.length} step{steps.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* 1. Overview */}
      <Section title="Overview">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Participants" a={String(overview.participants)} b="" sampleA={overview.participants} sampleB={0} />
          <StatTile label="Completion rate" a={fmtPct(overview.completionRate)} b="" sampleA={overview.participants} sampleB={0} />
          <StatTile label="Median study time" a={fmtMs(overview.medianStudyDurationMs)} b="" sampleA={overview.participants} sampleB={0} />
          <StatTile
            label="Avg steps completed"
            a={overview.avgStepsCompleted != null ? overview.avgStepsCompleted.toFixed(1) : "—"}
            b=""
            sampleA={overview.participants}
            sampleB={0}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Device breakdown:{" "}
          {Object.entries(overview.deviceBreakdown)
            .map(([device, count]) => `${device} (${count})`)
            .join(", ") || "—"}
        </p>
      </Section>

      {/* 2. Per-step analysis */}
      <Section title="Per-Step Analysis">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Completion rate by step</h4>
            <StepBar
              items={perStep.map((s) => ({
                label: s.title,
                value: s.completionRate ?? 0,
                display: fmtPct(s.completionRate),
              }))}
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Median time per step</h4>
            <StepBar
              items={perStep.map((s) => ({
                label: s.title,
                value: s.medianDurationMs ?? 0,
                display: fmtMs(s.medianDurationMs),
              }))}
            />
          </div>
        </div>

        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Full step metric table</summary>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Step</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Completed</th>
                  <th className="px-4 py-3 font-medium">Completion rate</th>
                  <th className="px-4 py-3 font-medium">Median time</th>
                  <th className="px-4 py-3 font-medium">Avg interactions</th>
                  <th className="px-4 py-3 font-medium">Avg unhandled</th>
                  <th className="px-4 py-3 font-medium">Avg backtracking</th>
                </tr>
              </thead>
              <tbody>
                {perStep.map((s) => (
                  <tr key={s.stepId} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-900">{s.title}</td>
                    <td className="px-4 py-3 text-slate-700">{s.started}</td>
                    <td className="px-4 py-3 text-slate-700">{s.completed}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtPct(s.completionRate)}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtMs(s.medianDurationMs)}</td>
                    <td className="px-4 py-3 text-slate-700">{s.avgInteractions != null ? s.avgInteractions.toFixed(1) : "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{s.avgUnhandled != null ? s.avgUnhandled.toFixed(1) : "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{s.avgBacktracking != null ? s.avgBacktracking.toFixed(1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>

      {/* 3. Friction ranking */}
      <Section title="Friction Ranking">
        <FrictionRanking steps={frictionRanking} />
      </Section>

      {/* 4. Question analysis */}
      <Section title="Question Analysis">
        <QuestionAnalysis questions={questionSummaries} />
      </Section>

      {/* 5. Final study feedback */}
      <Section title="Final Study Feedback">
        <FinalStudyFeedback responses={studyResponses} />
      </Section>

      {/* 6. AI Insights */}
      <Section title="AI Insights">
        <AiInsightsSection subjectType="usability" subjectId={study.id} generateUsabilityAction={generateUsabilityInsightsAction} />
      </Section>

      {/* 7. Individual participant journeys */}
      <Section title="Participant Journeys">
        <UsabilitySessionList
          sessions={sessions}
          stepSessions={stepSessions}
          steps={steps}
          questions={questions}
          responses={responses}
          events={events}
        />
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
