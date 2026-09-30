import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUsabilityStudy, listUsabilityStepsForStudy, listUsabilityQuestionsForStep } from "@/lib/usability-queries";
import StepBuilder from "@/components/StepBuilder";

export const dynamic = "force-dynamic";

export default function EditUsabilityStudyPage({ params }: { params: { id: string } }) {
  const study = getUsabilityStudy(params.id);
  if (!study) notFound();

  const steps = listUsabilityStepsForStudy(study.id);
  const questionsByStep: Record<string, ReturnType<typeof listUsabilityQuestionsForStep>> = {};
  for (const step of steps) {
    questionsByStep[step.id] = listUsabilityQuestionsForStep(step.id);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/studies/${study.id}`}
        className="mb-6 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Back to study
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">{study.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Build the sequence of steps participants will move through. Reorder with the arrows — no drag-and-drop.
      </p>

      <div className="mt-8">
        {steps.length === 0 && (
          <p className="mb-3 text-sm text-slate-400">No steps yet — add the first one below.</p>
        )}
        <StepBuilder studyId={study.id} steps={steps} questionsByStep={questionsByStep} />
      </div>

      {steps.length > 0 && (
        <div className="mt-8">
          <Link
            href={`/studies/${study.id}`}
            className="inline-flex min-h-11 items-center rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
          >
            Done editing steps
          </Link>
        </div>
      )}
    </main>
  );
}
