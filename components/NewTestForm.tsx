"use client";

import { useState } from "react";
import { createTestAction, updateTestAction } from "@/lib/actions";
import { TEST_TEMPLATES, getTemplate } from "@/lib/templates";
import type { Test } from "@/lib/queries";
import ConfirmResetModal from "./ConfirmResetModal";

// Templates are configuration presets only — selecting one just changes the
// default values below via React state. Submission still goes through the
// same createTestAction/db.createTest path as "start from scratch," so there
// is no separate testing logic for templated tests.
//
// Passing `test` switches the form into edit mode: fields are pre-filled from
// the existing test (template selection is hidden — editing doesn't re-apply
// a template), and submission is intercepted client-side to show the
// results-reset confirmation before calling updateTestAction. Omitting `test`
// keeps this byte-identical to the original create-only form.
export default function NewTestForm({ test }: { test?: Test } = {}) {
  const isEdit = Boolean(test);
  const [mode, setMode] = useState<"scratch" | "template">("scratch");
  const [templateId, setTemplateId] = useState<string>(TEST_TEMPLATES[0].id);
  const template = !isEdit && mode === "template" ? getTemplate(templateId) : undefined;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleEditSubmit(formData: FormData) {
    setPendingFormData(formData);
    setConfirmOpen(true);
  }

  async function confirmAndSave() {
    if (!pendingFormData || !test) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateTestAction(test.id, pendingFormData);
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes. Please try again.");
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={isEdit ? handleEditSubmit : createTestAction} className="space-y-6">
      {isEdit && (
        <ConfirmResetModal
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirmAndSave}
          confirming={submitting}
        />
      )}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {!isEdit && (
        <div>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("scratch")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === "scratch" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Start from scratch
            </button>
            <button
              type="button"
              onClick={() => setMode("template")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === "template" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Choose a template
            </button>
          </div>

          {mode === "template" && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <input type="hidden" name="template_id" value={templateId} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TEST_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`rounded-md border px-3 py-2 text-left text-xs font-medium ${
                      templateId === t.id
                        ? "border-slate-900 bg-white text-slate-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              {template && template.id !== "custom" && (
                <div className="text-xs text-slate-600">
                  <p className="font-medium text-slate-700">Goal: {template.goal}</p>
                  {template.suggestedMetrics.length > 0 && (
                    <p className="mt-1">
                      Suggested metrics: {template.suggestedMetrics.join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-slate-500">Everything below is editable — this only pre-fills suggestions.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">Test Name</label>
        <input
          key={`name-${templateId}-${mode}`}
          name="name"
          required
          defaultValue={test?.name ?? template?.titleSuggestion ?? ""}
          placeholder="Checkout Flow Test"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Participant Task</label>
        <textarea
          key={`task-${templateId}-${mode}`}
          name="task"
          required
          rows={3}
          defaultValue={test?.task ?? template?.exampleTask ?? ""}
          placeholder="Add the headphones to your cart and continue until you reach the payment screen."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">Give participants one clear task to complete.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Test device</label>
        <div className="mt-1 flex gap-4">
          <label className="flex items-center gap-1.5 text-sm text-slate-700">
            <input
              type="radio"
              name="device_type"
              value="desktop"
              defaultChecked={(test?.device_type ?? "desktop") === "desktop"}
            />{" "}
            Desktop
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-700">
            <input type="radio" name="device_type" value="mobile" defaultChecked={test?.device_type === "mobile"} /> Mobile
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Mobile optimizes the participant page for phone viewports. Results can still be filtered by device later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Figma Prototype A URL</label>
          <input
            name="figma_url_a"
            required
            defaultValue={test?.figma_url_a ?? ""}
            placeholder="https://www.figma.com/proto/..."
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Figma Prototype B URL</label>
          <input
            name="figma_url_b"
            required
            defaultValue={test?.figma_url_b ?? ""}
            placeholder="https://www.figma.com/proto/..."
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Target participants — Variant A</label>
          <input
            name="target_a"
            type="number"
            defaultValue={test?.target_a ?? undefined}
            placeholder="50"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Target participants — Variant B</label>
          <input
            name="target_b"
            type="number"
            defaultValue={test?.target_b ?? undefined}
            placeholder="50"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Variant A final screen link</label>
          <input
            name="success_link_a"
            defaultValue={test?.success_node_a ?? ""}
            placeholder="https://www.figma.com/proto/...?node-id=231-82"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Variant B final screen link</label>
          <input
            name="success_link_b"
            defaultValue={test?.success_node_b ?? ""}
            placeholder="https://www.figma.com/proto/...?node-id=231-82"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Right-click the final screen in Figma&rsquo;s Present view and copy its link — we&rsquo;ll pull the node ID
        out automatically. Leave blank to show a &ldquo;Finish Task&rdquo; button instead of automatic completion.
        {isEdit && " Already-configured links show as the extracted node ID — leave as-is to keep it unchanged."}
        {template && template.successGuidance && (
          <span className="mt-1 block text-slate-600">{template.successGuidance}</span>
        )}
      </p>

      <div>
        <label className="block text-sm font-medium text-slate-700">Post-test question (optional)</label>
        <textarea
          name="post_test_question"
          rows={2}
          defaultValue={test?.post_test_question ?? ""}
          placeholder="What, if anything, made this task difficult?"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          If set, participants see this as a text question right after finishing the task, before the thank-you
          screen. Leave blank to skip straight to thank-you, as before.
        </p>
      </div>

      <button
        type="submit"
        disabled={isEdit && submitting}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isEdit ? "Save Changes" : "Create Test"}
      </button>
    </form>
  );
}
