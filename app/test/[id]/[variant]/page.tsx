import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTest } from "@/lib/queries";
import ParticipantExperience from "@/components/ParticipantExperience";

export const dynamic = "force-dynamic";

export default function ParticipantPage({ params }: { params: { id: string; variant: string } }) {
  const test = getTest(params.id);
  if (!test) notFound();

  const variant = params.variant === "b" ? "b" : "a";

  return (
    <Suspense fallback={null}>
      <ParticipantExperience test={test} variant={variant} />
    </Suspense>
  );
}
