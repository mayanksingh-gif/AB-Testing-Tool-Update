"use client";

import { createUsabilityStudyAction } from "@/lib/usability-actions";

// Mirrors NewTestForm.tsx's structure/conventions, scoped down to what a
// usability study needs up front (name/description/intro/device) — steps,
// prototypes, and questions are added afterwards in the step builder.
export default function UsabilityStudyForm() {
  return (
    <form action={createUsabilityStudyAction} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700">Study Name</label>
        <input
          name="name"
          required
          placeholder="Onboarding Flow Walkthrough"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
        <textarea
          name="description"
          rows={2}
          placeholder="What this study is trying to learn."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">Shown to you only — participants never see this.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Intro instructions for participants (optional)</label>
        <textarea
          name="intro_instruction"
          rows={2}
          placeholder="You'll be guided through a few steps in a prototype. Take your time and think out loud if you'd like."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">Shown to participants before the first step.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Final study question (optional)</label>
        <textarea
          name="final_question"
          rows={2}
          placeholder="What, if anything, made this study difficult?"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          If set, participants see this as a text question once, after the last step (and its step question, if
          any), before the completion screen. Leave blank to skip straight to completion, as before.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Study device</label>
        <div className="mt-1 flex gap-4">
          <label className="flex items-center gap-1.5 text-sm text-slate-700">
            <input type="radio" name="device_type" value="desktop" defaultChecked /> Desktop
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-700">
            <input type="radio" name="device_type" value="mobile" /> Mobile
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Optimizes the participant page layout for the chosen viewport.
        </p>
      </div>

      <button
        type="submit"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Create Study &amp; Add Steps
      </button>
    </form>
  );
}
