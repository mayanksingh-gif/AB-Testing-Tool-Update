import type { UsabilityStudyResponse } from "@/lib/usability-queries";

// Whole-study final feedback (one optional question, asked once at the end)
// — simpler than FeedbackSection.tsx's A/B variant since there's no variant
// split to tab through, just a card list of raw responses.
export default function FinalStudyFeedback({ responses }: { responses: UsabilityStudyResponse[] }) {
  if (responses.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No final study question configured, or no responses submitted yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {responses.map((r) => (
        <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">{r.question}</span>
            <span className="text-xs text-slate-400">{new Date(r.submitted_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-slate-700">{r.response_text}</p>
        </div>
      ))}
    </div>
  );
}
