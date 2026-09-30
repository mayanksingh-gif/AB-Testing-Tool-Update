"use client";

import { useState } from "react";
import { toEmbedUrl } from "@/lib/figma";
import { logUsabilityEventAction } from "@/lib/usability-actions";
import type { UsabilityStep } from "@/lib/usability-queries";
import FigmaEmbed from "./FigmaEmbed";

// Thin wrapper around FigmaEmbed for a single usability step. Uses the
// additive-only onLogEvent prop (Decision 2) to route events at
// logUsabilityEventAction instead of the A/B logEventAction — FigmaEmbed's
// own safety-critical origin/source checks are never touched here.
export default function StepFigmaEmbed({
  step,
  studyId,
  sessionId,
  startedAtMs,
  debug,
  onDone,
}: {
  step: UsabilityStep;
  studyId: string;
  sessionId: string;
  startedAtMs: number;
  debug: boolean;
  onDone: () => void;
}) {
  const [doneCalled, setDoneCalled] = useState(false);

  function handleSuccessNodeReached() {
    if (doneCalled) return;
    setDoneCalled(true);
    onDone();
  }

  if (!step.figma_url) {
    // A question-only step with no prototype — nothing to embed, the caller
    // should not render this component at all in that case, but guard anyway.
    return null;
  }

  return (
    <FigmaEmbed
      src={toEmbedUrl(step.figma_url)}
      testId={studyId}
      sessionId={sessionId}
      variant="a"
      startedAtMs={startedAtMs}
      successNode={step.success_node_id}
      debug={debug}
      onSuccessNodeReached={handleSuccessNodeReached}
      onLogEvent={(input) => {
        logUsabilityEventAction({
          study_id: studyId,
          session_id: sessionId,
          step_id: step.id,
          event_type: input.event_type,
          elapsed_ms: input.elapsed_ms,
          presented_node_id: input.presented_node_id,
          target_node_id: input.target_node_id,
          x: input.x,
          y: input.y,
          handled: input.handled,
          raw_payload: input.raw_payload,
        }).catch(() => {});
      }}
    />
  );
}
