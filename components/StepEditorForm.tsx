"use client";

import { useState } from "react";
import { createUsabilityStepAction } from "@/lib/usability-actions";

// Adds one step at a time — title, instruction, Figma URL, optional success
// screen link. No drag-and-drop anywhere in this app; reordering existing
// steps happens via Move up/down in StepBuilder, not here.
export default function StepEditorForm({ studyId }: { studyId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
      >
        + Add Step
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setError(null);
        setSubmitting(true);
        try {
          await createUsabilityStepAction(formData);
          setOpen(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't add step. Please try again.");
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-5"
    >
      <input type="hidden" name="study_id" value={studyId} />

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">Step title</label>
        <input
          name="title"
          required
          placeholder="Add item to cart"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Instruction for the participant</label>
        <textarea
          name="instruction"
          required
          rows={2}
          placeholder="Find the headphones and add them to your cart."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Starting Figma URL</label>
        <input
          name="figma_url"
          required
          placeholder="https://www.figma.com/proto/..."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">The screen participants see when this step begins.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Final screen Figma URL</label>
        <input
          name="success_link"
          required
          placeholder="https://www.figma.com/proto/...?node-id=231-82"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          Right-click the target success screen in Figma&rsquo;s Present view and copy its link. Reaching this
          screen marks the step complete automatically.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add Step"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(false);
          }}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
