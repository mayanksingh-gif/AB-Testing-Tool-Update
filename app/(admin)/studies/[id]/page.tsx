import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUsabilityStudy, listUsabilityStepsForStudy } from "@/lib/usability-queries";
import CopyLinkButton from "@/components/CopyLinkButton";
import PublishStudyButton from "@/components/PublishStudyButton";
import { getOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

export default function UsabilityStudyOverviewPage({ params }: { params: { id: string } }) {
  const study = getUsabilityStudy(params.id);
  if (!study) notFound();

  const steps = listUsabilityStepsForStudy(study.id);
  const origin = getOrigin(headers());
  const link = `${origin}/usability/${study.id}`;
  const incompleteStepIndex = steps.findIndex((s) => !s.figma_url || !s.success_node_id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Back to home
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">{study.name}</h1>
      <div className="mt-1 flex gap-2">
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

      <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {study.description && (
          <div>
            <div className="text-xs font-medium uppercase text-slate-400">Description</div>
            <p className="mt-1 text-sm text-slate-800">{study.description}</p>
          </div>
        )}
        {study.intro_instruction && (
          <div>
            <div className="text-xs font-medium uppercase text-slate-400">Participant intro</div>
            <p className="mt-1 text-sm text-slate-600">{study.intro_instruction}</p>
          </div>
        )}
        <div>
          <div className="text-xs font-medium uppercase text-slate-400">Steps</div>
          <ol className="mt-1 list-inside list-decimal space-y-0.5 text-sm text-slate-600">
            {steps.map((s) => (
              <li key={s.id}>{s.title}</li>
            ))}
          </ol>
        </div>
      </div>

      <Link
        href={`/studies/${study.id}/edit`}
        className="mt-4 inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Edit Steps
      </Link>

      {study.status !== "published" ? (
        <>
          {steps.length === 0 ? (
            <p className="mt-6 text-xs text-slate-500">Add at least one step before publishing.</p>
          ) : incompleteStepIndex !== -1 ? (
            <p className="mt-6 text-xs text-slate-500">
              Step {incompleteStepIndex + 1} is incomplete. Add both the starting and final Figma screen URLs
              before publishing.
            </p>
          ) : (
            <PublishStudyButton studyId={study.id} />
          )}
        </>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium uppercase text-slate-400">Participant link</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <code className="truncate text-sm text-slate-700">{link}</code>
              <CopyLinkButton text={link} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Share this single link — every participant walks the same step sequence.</p>
          <Link
            href={`/studies/${study.id}/usability/results`}
            className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View Results
          </Link>
        </div>
      )}
    </main>
  );
}
