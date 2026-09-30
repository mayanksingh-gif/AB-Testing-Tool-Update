"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  startUsabilitySessionAction,
  startUsabilityStepSessionAction,
  completeUsabilityStepSessionAction,
  completeUsabilitySessionAction,
  submitUsabilityResponseAction,
  submitUsabilityStudyResponseAction,
} from "@/lib/usability-actions";
import type { UsabilityStudy, UsabilityStep, UsabilityQuestion, UsabilitySession, UsabilityStepSession } from "@/lib/usability-queries";
import StepFigmaEmbed from "./StepFigmaEmbed";
import StepQuestionScreen from "./StepQuestionScreen";
import StepProgressBar from "./StepProgressBar";

type Phase = "intro" | "step" | "step_question" | "study_question" | "completed";

export default function UsabilityParticipantExperience({
  study,
  steps,
  questionsByStep,
}: {
  study: UsabilityStudy;
  steps: UsabilityStep[];
  questionsByStep: Record<string, UsabilityQuestion[]>;
}) {
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "true";

  const [phase, setPhase] = useState<Phase>("intro");
  const [starting, setStarting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [session, setSession] = useState<UsabilitySession | null>(null);
  const [stepSession, setStepSession] = useState<UsabilityStepSession | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [finalResponseText, setFinalResponseText] = useState("");
  const [submittingFinalResponse, setSubmittingFinalResponse] = useState(false);

  const isMobile = study.device_type === "mobile";
  const currentStep = steps[stepIndex];
  const currentQuestion = currentStep ? questionsByStep[currentStep.id]?.[0] : undefined;

  async function handleStart() {
    setStarting(true);
    const newSession = await startUsabilitySessionAction(study.id, study.device_type);
    setSession(newSession);
    await beginStep(newSession.id, 0);
    setStarting(false);
  }

  async function beginStep(sessionId: string, index: number) {
    const step = steps[index];
    if (!step) return;
    const ss = await startUsabilityStepSessionAction(sessionId, step.id);
    setStepSession(ss);
    setStartedAtMs(Date.now());
    setStepIndex(index);
    setPhase("step");
  }

  const advanceAfterStep = useCallback(async () => {
    if (!stepSession || !session || !currentStep) return;
    await completeUsabilityStepSessionAction(stepSession.id, "completed");
    if (currentQuestion) {
      setPhase("step_question");
      return;
    }
    await goToNextStepOrFinish(session.id);
  }, [stepSession, session, currentStep, currentQuestion]);

  async function goToNextStepOrFinish(sessionId: string) {
    const nextIndex = stepIndex + 1;
    if (nextIndex < steps.length) {
      await beginStep(sessionId, nextIndex);
    } else if (study.final_question) {
      // Only branch into the final study question when the researcher
      // configured one — otherwise this is byte-identical to before.
      setPhase("study_question");
    } else {
      await completeUsabilitySessionAction(sessionId);
      setPhase("completed");
    }
  }

  async function handleQuestionSubmit(input: {
    text_response?: string | null;
    numeric_response?: number | null;
    selected_option?: string | null;
  }) {
    if (!session || !currentStep || !currentQuestion) return;
    await submitUsabilityResponseAction({
      session_id: session.id,
      step_id: currentStep.id,
      question_id: currentQuestion.id,
      ...input,
    });
    await goToNextStepOrFinish(session.id);
  }

  async function handleQuestionSkip() {
    if (!session) return;
    await goToNextStepOrFinish(session.id);
  }

  async function finishStudy() {
    if (!session) return;
    await completeUsabilitySessionAction(session.id);
    setPhase("completed");
  }

  async function submitFinalResponse() {
    if (!session || !study.final_question) return;
    setSubmittingFinalResponse(true);
    if (finalResponseText.trim()) {
      await submitUsabilityStudyResponseAction({
        study_id: study.id,
        session_id: session.id,
        question: study.final_question,
        response_text: finalResponseText.trim(),
      });
    }
    setSubmittingFinalResponse(false);
    await finishStudy();
  }

  async function skipFinalResponse() {
    await finishStudy();
  }

  if (phase === "intro") {
    return (
      <main className="flex h-dvh w-full flex-col items-center justify-center bg-white px-6 text-center">
        <div className="max-w-md">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usability study</div>
          <h1 className="mt-2 text-xl font-medium leading-snug text-slate-900 sm:text-2xl">{study.name}</h1>
          {study.intro_instruction && (
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{study.intro_instruction}</p>
          )}
          <p className="mt-3 text-xs text-slate-400">
            You'll move through {steps.length} step{steps.length === 1 ? "" : "s"}, one at a time.
          </p>
          <button
            onClick={handleStart}
            disabled={starting || steps.length === 0}
            className="mt-8 rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Start
          </button>
          <p className="mt-4 text-xs text-slate-400">
            Complete each step naturally. Your interactions may be recorded for usability analysis.
          </p>
        </div>
      </main>
    );
  }

  if (phase === "step" && session && stepSession && startedAtMs && currentStep) {
    return (
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950">
        <div className="relative min-h-0 flex-1">
          {currentStep.figma_url ? (
            <StepFigmaEmbed
              step={currentStep}
              studyId={study.id}
              sessionId={session.id}
              startedAtMs={startedAtMs}
              debug={debug}
              onDone={advanceAfterStep}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-white px-6 text-center">
              <p className="max-w-md text-sm leading-relaxed text-slate-700">{currentStep.instruction}</p>
            </div>
          )}
          {/* Always-available fallback, same affordance as the A/B "Finish Task"
              button — success-node auto-advance may not fire (no allowed embed
              origin configured, or the participant reaches the goal another way). */}
          <button
            onClick={advanceAfterStep}
            className={
              isMobile
                ? "absolute right-3 top-3 min-h-9 rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-white shadow-md hover:bg-slate-700"
                : "absolute right-4 top-4 min-h-9 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg hover:bg-slate-700"
            }
          >
            {stepIndex + 1 < steps.length || currentQuestion ? "Continue" : "Finish"}
          </button>
        </div>
        <StepProgressBar
          stepIndex={stepIndex}
          totalSteps={steps.length}
          instruction={currentStep.instruction}
          deviceType={study.device_type}
        />
      </div>
    );
  }

  if (phase === "step_question" && currentQuestion) {
    return (
      <StepQuestionScreen
        question={currentQuestion}
        onSubmit={handleQuestionSubmit}
        onSkip={handleQuestionSkip}
      />
    );
  }

  if (phase === "study_question" && study.final_question) {
    return (
      <main className="flex h-dvh w-full flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-full max-w-md text-left">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">One last thing</div>
          <p className="mt-2 text-lg font-medium leading-snug text-slate-900">{study.final_question}</p>
          <textarea
            value={finalResponseText}
            onChange={(e) => setFinalResponseText(e.target.value)}
            rows={5}
            placeholder="Type your answer here…"
            className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={submitFinalResponse}
            disabled={submittingFinalResponse}
            className="mt-4 w-full rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Submit
          </button>
          <button
            onClick={skipFinalResponse}
            className="mt-2 w-full rounded-md px-6 py-2 text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Skip
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh w-full flex-col items-center justify-center bg-white text-center">
      <p className="text-2xl font-medium text-slate-900">Thank you</p>
      <p className="mt-2 text-sm text-slate-500">Your session has been recorded.</p>
    </main>
  );
}
