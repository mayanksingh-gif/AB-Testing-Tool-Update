import type { QuestionSummary } from "@/lib/usability-metrics";

// Rating/single_choice reuse the same bucket-bar visual language as
// InteractionDistribution.tsx; yes/no gets a small two-segment bar; text
// shows raw responses (AI theming is layered on separately via
// AiInsightsSection, not duplicated here).
export default function QuestionAnalysis({ questions }: { questions: QuestionSummary[] }) {
  if (questions.length === 0) {
    return <p className="text-xs text-slate-400">No questions configured for this study.</p>;
  }

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.questionId} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900">{q.questionText}</p>
            <span className="text-xs text-slate-400">{q.responseCount} response{q.responseCount === 1 ? "" : "s"}</span>
          </div>

          {q.questionType === "rating" && (
            <p className="text-sm text-slate-700">
              Average rating:{" "}
              <span className="font-semibold">{q.averageRating != null ? q.averageRating.toFixed(1) : "—"} / 5</span>
            </p>
          )}

          {(q.questionType === "single_choice" || q.questionType === "yes_no") && q.optionCounts && (
            <OptionBars counts={q.optionCounts} />
          )}

          {q.questionType === "text" && (
            <div className="space-y-1.5">
              {q.textResponses && q.textResponses.length > 0 ? (
                q.textResponses.map((t, i) => (
                  <p key={i} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    “{t}”
                  </p>
                ))
              ) : (
                <p className="text-xs text-slate-400">No responses yet.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function OptionBars({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return <p className="text-xs text-slate-400">No responses yet.</p>;
  const max = Math.max(...entries.map(([, c]) => c), 1);
  return (
    <div className="space-y-1.5">
      {entries.map(([option, count]) => (
        <div key={option} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-xs text-slate-600">{option}</span>
          <div className="h-3.5 flex-1 rounded-sm bg-slate-100">
            <div
              className="h-3.5 rounded-sm"
              style={{ width: `${Math.max((count / max) * 100, 4)}%`, backgroundColor: "var(--variant-a)" }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-medium text-slate-700">{count}</span>
        </div>
      ))}
    </div>
  );
}
