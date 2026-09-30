import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getUsabilityStudy, listUsabilityStepsForStudy, listUsabilityQuestionsForStep } from "@/lib/usability-queries";
import UsabilityParticipantExperience from "@/components/UsabilityParticipantExperience";

export const dynamic = "force-dynamic";

export default function UsabilityParticipantPage({ params }: { params: { id: string } }) {
  const study = getUsabilityStudy(params.id);
  if (!study) notFound();

  const steps = listUsabilityStepsForStudy(study.id);
  const questionsByStep: Record<string, ReturnType<typeof listUsabilityQuestionsForStep>> = {};
  for (const step of steps) {
    questionsByStep[step.id] = listUsabilityQuestionsForStep(step.id);
  }

  return (
    <Suspense fallback={null}>
      <UsabilityParticipantExperience study={study} steps={steps} questionsByStep={questionsByStep} />
    </Suspense>
  );
}
