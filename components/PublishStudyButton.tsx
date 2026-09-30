"use client";

import { useState } from "react";
import { publishUsabilityStudyAction } from "@/lib/usability-actions";

// publishTestAction's plain <form action={...}> pattern (app/tests/[id]/page.tsx)
// works because it never throws. publishUsabilityStudyAction now throws a
// specific validation message (missing steps / incomplete step URLs), so
// this needs the same client-side try/catch + inline error rendering that
// NewTestForm.tsx uses for edits, or the thrown Error would just crash the
// page instead of showing a message.
export default function PublishStudyButton({ studyId }: { studyId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handlePublish() {
    setError(null);
    setSubmitting(true);
    try {
      await publishUsabilityStudyAction(studyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish study. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      {error && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="button"
        onClick={handlePublish}
        disabled={submitting}
        className="inline-flex min-h-11 items-center rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {submitting ? "Publishing…" : "Publish Study"}
      </button>
    </div>
  );
}
