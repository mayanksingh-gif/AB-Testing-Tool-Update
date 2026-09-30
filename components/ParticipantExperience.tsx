"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { startSessionAction, completeSessionAction, submitAbResponseAction } from "@/lib/actions";
import { toEmbedUrl } from "@/lib/figma";
import type { Session, Test, Variant } from "@/lib/queries";
import FigmaEmbed from "./FigmaEmbed";
import TaskBar from "./TaskBar";

type Step = "instruction" | "prototype" | "post_question" | "thanks";

export default function ParticipantExperience({ test, variant }: { test: Test; variant: Variant }) {
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "true";

  const [step, setStep] = useState<Step>("instruction");
  const [session, setSession] = useState<Session | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const figmaUrl = variant === "a" ? test.figma_url_a : test.figma_url_b;
  const successNode = variant === "a" ? test.success_node_a : test.success_node_b;
  const deviceType = test.device_type;
  const isMobile = deviceType === "mobile";

  async function handleStart() {
    setStarting(true);
    const newSession = await startSessionAction(test.id, variant, deviceType);
    setSession(newSession);
    setStartedAtMs(Date.now());
    setStep("prototype");
    setStarting(false);
  }

  const finishTask = useCallback(async () => {
    if (!session) return;
    await completeSessionAction(session.id);
    // Only branch into the post-task question step when the researcher
    // configured one — otherwise this is byte-identical to the prior flow.
    setStep(test.post_test_question ? "post_question" : "thanks");
  }, [session, test.post_test_question]);

  async function submitResponse() {
    if (!session) return;
    setSubmittingResponse(true);
    if (responseText.trim() && test.post_test_question) {
      await submitAbResponseAction({
        test_id: test.id,
        session_id: session.id,
        variant,
        question: test.post_test_question,
        response_text: responseText.trim(),
      });
    }
    setSubmittingResponse(false);
    setStep("thanks");
  }

  if (step === "instruction") {
    return (
      <main className="flex h-dvh w-full flex-col items-center justify-center bg-white px-6 text-center">
        <div className="max-w-md">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your task</div>
          <p className="mt-3 text-xl font-medium leading-snug text-slate-900 sm:text-2xl">{test.task}</p>
          <button
            onClick={handleStart}
            disabled={starting}
            className="mt-8 rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Start Task
          </button>
          <p className="mt-4 text-xs text-slate-400">
            Complete the task naturally. Your prototype interactions may be recorded for usability analysis.
          </p>
        </div>
      </main>
    );
  }

  if (step === "prototype" && session && startedAtMs) {
    return (
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950">
        {/* The prototype itself owns the full-bleed area above the task bar.
            Keeping the task bar pinned to the bottom (instead of the top)
            means it never sits directly over the design's own top-of-screen
            UI (status bar, header, nav) — the source of the cramped overlap
            reported earlier. */}
        <div className="relative min-h-0 flex-1">
          <FigmaEmbed
            src={toEmbedUrl(figmaUrl)}
            testId={test.id}
            sessionId={session.id}
            variant={variant}
            startedAtMs={startedAtMs}
            successNode={successNode}
            debug={debug}
            onSuccessNodeReached={finishTask}
          />
          {/* Always available, even when a success node is configured: if the
              Figma Embed API's automatic completion detection doesn't fire
              (e.g. no client-id/allowed embed origin configured, or the
              participant reaches the goal a different way), the participant
              must still have a way to finish and see the thank-you screen.
              Anchored top-right so it never collides with the task bar,
              which now lives at the bottom of the screen. */}
          <button
            onClick={finishTask}
            className={
              // z-20: stays above FigmaEmbed's own interaction-lock overlay
              // (z-10), which only covers the embedded prototype itself once
              // a success node is auto-detected. This button is a distinct,
              // deliberate participant action — it is never locked/delayed.
              isMobile
                ? "absolute right-3 top-3 z-20 min-h-9 rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-white shadow-md hover:bg-slate-700"
                : "absolute right-4 top-4 z-20 min-h-9 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg hover:bg-slate-700"
            }
          >
            Finish Task
          </button>
        </div>
        <TaskBar task={test.task} deviceType={deviceType} />
      </div>
    );
  }

  if (step === "post_question" && test.post_test_question) {
    return (
      <main className="flex h-dvh w-full flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-full max-w-md text-left">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">One last thing</div>
          <p className="mt-2 text-lg font-medium leading-snug text-slate-900">{test.post_test_question}</p>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={5}
            placeholder="Type your answer here…"
            className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={submitResponse}
            disabled={submittingResponse}
            className="mt-4 w-full rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Submit
          </button>
          <button
            onClick={() => setStep("thanks")}
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
      <p className="mt-2 text-sm text-slate-500">Your task has been recorded.</p>
    </main>
  );
}
