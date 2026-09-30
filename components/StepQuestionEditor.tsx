"use client";

import { useState } from "react";
import { createUsabilityQuestionAction, deleteUsabilityQuestionAction } from "@/lib/usability-actions";
import type { UsabilityQuestion, QuestionType } from "@/lib/usability-queries";

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "Open text",
  rating: "Rating (1–5)",
  single_choice: "Single choice",
  yes_no: "Yes / No",
};

export default function StepQuestionEditor({
  studyId,
  stepId,
  questions,
}: {
  studyId: string;
  stepId: string;
  questions: UsabilityQuestion[];
}) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<QuestionType>("text");

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      {questions.map((q) => {
        let options: string[] = [];
        if (q.options_json) {
          try {
            options = JSON.parse(q.options_json);
          } catch {
            options = [];
          }
        }
        return (
          <div key={q.id} className="flex items-start justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs">
            <div>
              <span className="font-medium text-slate-700">{q.question_text}</span>
              <span className="ml-2 text-slate-400">{TYPE_LABELS[q.question_type]}</span>
              {options.length > 0 && <span className="ml-2 text-slate-400">({options.join(", ")})</span>}
              {q.required === 1 && <span className="ml-2 text-amber-600">required</span>}
            </div>
            <button
              type="button"
              onClick={() => deleteUsabilityQuestionAction(q.id, studyId)}
              className="shrink-0 text-slate-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        );
      })}

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          + Add question to this step
        </button>
      ) : (
        <form
          action={async (formData) => {
            await createUsabilityQuestionAction(formData);
            setAdding(false);
            setType("text");
          }}
          className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
        >
          <input type="hidden" name="step_id" value={stepId} />
          <input type="hidden" name="study_id" value={studyId} />
          <input
            name="question_text"
            required
            placeholder="How easy was that to find?"
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <select
              name="question_type"
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input type="checkbox" name="required" /> Required
            </label>
          </div>
          {type === "single_choice" && (
            <textarea
              name="options"
              rows={3}
              required
              placeholder={"One option per line\nEasy\nSomewhat difficult\nVery difficult"}
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
            />
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              Add Question
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
