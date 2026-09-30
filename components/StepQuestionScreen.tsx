"use client";

import { useState } from "react";
import type { UsabilityQuestion } from "@/lib/usability-queries";

// Renders the right input for a step's optional question, by question_type.
// Submitting always calls onSubmit with a normalized payload shape; onSkip
// is only reachable when the question isn't required.
export default function StepQuestionScreen({
  question,
  onSubmit,
  onSkip,
}: {
  question: UsabilityQuestion;
  onSubmit: (input: { text_response?: string | null; numeric_response?: number | null; selected_option?: string | null }) => void;
  onSkip: () => void;
}) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const options: string[] = question.options_json ? JSON.parse(question.options_json) : [];
  const isRequired = !!question.required;

  function canSubmit() {
    if (question.question_type === "text") return text.trim().length > 0;
    if (question.question_type === "rating") return rating !== null;
    if (question.question_type === "single_choice") return choice !== null;
    if (question.question_type === "yes_no") return choice !== null;
    return false;
  }

  function handleSubmit() {
    if (question.question_type === "text") {
      onSubmit({ text_response: text.trim() || null });
    } else if (question.question_type === "rating") {
      onSubmit({ numeric_response: rating });
    } else {
      onSubmit({ selected_option: choice });
    }
  }

  return (
    <main className="flex h-dvh w-full flex-col items-center justify-center bg-white px-6 text-center">
      <div className="w-full max-w-md text-left">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quick question</div>
        <p className="mt-2 text-lg font-medium leading-snug text-slate-900">{question.question_text}</p>

        {question.question_type === "text" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Type your answer here…"
            className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            autoFocus
          />
        )}

        {question.question_type === "rating" && (
          <div className="mt-4 flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`min-h-11 flex-1 rounded-md border text-sm font-medium ${
                  rating === n
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {question.question_type === "single_choice" && (
          <div className="mt-4 space-y-2">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => setChoice(opt)}
                className={`block min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm font-medium ${
                  choice === opt
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.question_type === "yes_no" && (
          <div className="mt-4 flex gap-2">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                onClick={() => setChoice(opt)}
                className={`min-h-11 flex-1 rounded-md border text-sm font-medium ${
                  choice === opt
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className="mt-4 w-full rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Continue
        </button>
        {!isRequired && (
          <button
            onClick={onSkip}
            className="mt-2 w-full rounded-md px-6 py-2 text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Skip
          </button>
        )}
      </div>
    </main>
  );
}
