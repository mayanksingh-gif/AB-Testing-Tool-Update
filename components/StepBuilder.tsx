"use client";

import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { deleteUsabilityStepAction, reorderStepAction } from "@/lib/usability-actions";
import StepEditorForm from "./StepEditorForm";
import StepQuestionEditor from "./StepQuestionEditor";
import type { UsabilityStep, UsabilityQuestion } from "@/lib/usability-queries";

// Ordered list, Add/Edit(inline questions)/Delete/Move up/Move down —
// explicitly no drag-and-drop, per the plan.
export default function StepBuilder({
  studyId,
  steps,
  questionsByStep,
}: {
  studyId: string;
  steps: UsabilityStep[];
  questionsByStep: Record<string, UsabilityQuestion[]>;
}) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={step.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {index + 1}
              </span>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{step.title}</h4>
                <p className="mt-0.5 text-xs text-slate-500">{step.instruction}</p>
                {step.figma_url && <p className="mt-1 truncate text-xs text-slate-400">{step.figma_url}</p>}
                {step.success_node_id && (
                  <p className="mt-0.5 text-xs text-slate-400">Success node: {step.success_node_id}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => reorderStepAction(step.id, studyId, "up")}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Move step up"
              >
                <ChevronUp size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                disabled={index === steps.length - 1}
                onClick={() => reorderStepAction(step.id, studyId, "down")}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Move step down"
              >
                <ChevronDown size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => deleteUsabilityStepAction(step.id, studyId)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete step"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          <StepQuestionEditor studyId={studyId} stepId={step.id} questions={questionsByStep[step.id] ?? []} />
        </div>
      ))}

      <StepEditorForm studyId={studyId} />
    </div>
  );
}
