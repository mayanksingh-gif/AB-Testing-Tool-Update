"use client";

import { useEffect, useRef, useState } from "react";
import { logEventAction } from "@/lib/actions";
import { normalizeFigmaNodeId } from "@/lib/figma";
import type { Variant } from "@/lib/queries";

// When the configured success node is reached, the final Figma frame stays
// visible for this long (with interaction already locked) before advancing —
// long enough for the participant to register they've arrived, short enough
// to not read as a stall. No loading indicator is shown during this window.
const SUCCESS_TRANSITION_DELAY_MS = 600;

interface ParsedFigmaMessage {
  type: string;
  presentedNodeId: string | null;
  targetNodeId: string | null;
  handled: boolean | null;
  x: number | null;
  y: number | null;
  raw: unknown;
}

// Figma's Embed Kit postMessage payloads aren't guaranteed to have identical
// shapes across event types, so this parses defensively.
function parseFigmaMessage(data: unknown): ParsedFigmaMessage | null {
  let parsed: any = data;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const type = parsed.type ?? parsed.name;
  if (!type) return null;

  const inner = parsed.data ?? {};
  return {
    type,
    presentedNodeId: parsed.presentedNodeId ?? inner.presentedNodeId ?? parsed.nodeId ?? null,
    targetNodeId: parsed.targetNodeId ?? inner.targetNodeId ?? null,
    handled: parsed.handled ?? inner.handled ?? null,
    x: parsed.x ?? inner.x ?? null,
    y: parsed.y ?? inner.y ?? null,
    raw: parsed,
  };
}

export default function FigmaEmbed({
  src,
  testId,
  sessionId,
  variant,
  startedAtMs,
  successNode,
  debug,
  onSuccessNodeReached,
  onLogEvent,
}: {
  src: string;
  testId: string;
  sessionId: string;
  variant: Variant;
  startedAtMs: number;
  successNode: string | null;
  debug: boolean;
  onSuccessNodeReached: () => void;
  // Additive-only escape hatch: usability steps pass this to route logged
  // events at logUsabilityEventAction instead of logEventAction. When
  // omitted (every existing A/B call site), behavior is byte-identical to
  // before this prop existed. The origin check, event.source check, and
  // defensive payload parsing above are never touched by this addition.
  onLogEvent?: (input: {
    event_type: string;
    elapsed_ms: number;
    presented_node_id: string | null;
    target_node_id: string | null;
    x: number | null;
    y: number | null;
    handled: boolean | null;
    raw_payload: unknown;
  }) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [debugEvents, setDebugEvents] = useState<ParsedFigmaMessage[]>([]);
  // Set the instant the success node is detected — locks the prototype
  // (via the overlay below) immediately, independent of the delay timer
  // that follows before onSuccessNodeReached actually fires.
  const [locked, setLocked] = useState(false);
  const normalizedSuccessNode = normalizeFigmaNodeId(successNode);

  useEffect(() => {
    // Reset lock state if the embed is reused for a new node/session.
    setLocked(false);
  }, [successNode]);

  useEffect(() => {
    let successTimer: ReturnType<typeof setTimeout> | null = null;

    function handleMessage(event: MessageEvent) {
      // Only accept messages from the embedded Figma iframe itself.
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!event.origin.includes("figma.com")) return;

      const parsed = parseFigmaMessage(event.data);
      if (!parsed) return;

      const elapsedMs = Date.now() - startedAtMs;

      if (debug) {
        setDebugEvents((prev) => [parsed, ...prev].slice(0, 20));
      }

      if (onLogEvent) {
        onLogEvent({
          event_type: parsed.type,
          elapsed_ms: elapsedMs,
          presented_node_id: parsed.presentedNodeId,
          target_node_id: parsed.targetNodeId,
          x: parsed.x,
          y: parsed.y,
          handled: parsed.handled,
          raw_payload: parsed.raw,
        });
      } else {
        logEventAction({
          test_id: testId,
          session_id: sessionId,
          variant,
          event_type: parsed.type,
          elapsed_ms: elapsedMs,
          presented_node_id: parsed.presentedNodeId,
          target_node_id: parsed.targetNodeId,
          x: parsed.x,
          y: parsed.y,
          handled: parsed.handled,
          raw_payload: parsed.raw,
        }).catch(() => {});
      }

      if (
        normalizedSuccessNode &&
        parsed.type === "PRESENTED_NODE_CHANGED" &&
        normalizeFigmaNodeId(parsed.presentedNodeId) === normalizedSuccessNode
      ) {
        // Lock immediately so no further interaction registers, but hold the
        // final frame on screen for SUCCESS_TRANSITION_DELAY_MS before
        // actually advancing — no loading state during that window.
        setLocked(true);
        successTimer = setTimeout(() => {
          onSuccessNodeReached();
        }, SUCCESS_TRANSITION_DELAY_MS);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (successTimer) clearTimeout(successTimer);
    };
  }, [testId, sessionId, variant, startedAtMs, normalizedSuccessNode, debug, onSuccessNodeReached, onLogEvent]);

  const lastPresentedNodeId = debugEvents[0]?.presentedNodeId ?? null;
  const normalizedPresentedNodeId = normalizeFigmaNodeId(lastPresentedNodeId);

  return (
    <div className="relative h-full w-full">
      <iframe
        ref={iframeRef}
        src={src}
        className="h-full w-full border-0"
        allowFullScreen
      />
      {/* Purely a click/pointer blocker — renders nothing visible. Added the
          instant the success node is detected so the participant can't keep
          interacting with the prototype during the brief hold before the
          completion screen appears. Never shown as a loading state. */}
      {locked && <div className="absolute inset-0 z-10" aria-hidden="true" />}
      {debug && (
        <div className="absolute bottom-0 left-0 max-h-64 w-96 overflow-y-auto bg-black/85 p-3 font-mono text-xs text-white">
          <div className="mb-1 border-b border-white/20 pb-2 font-bold">
            <div>Success node (configured): {String(successNode)}</div>
            <div>Success node (normalized): {String(normalizedSuccessNode)}</div>
            <div>Current presented node: {String(lastPresentedNodeId)}</div>
            <div>Current presented node (normalized): {String(normalizedPresentedNodeId)}</div>
            <div>
              Match:{" "}
              {normalizedSuccessNode && normalizedPresentedNodeId
                ? normalizedSuccessNode === normalizedPresentedNodeId
                  ? "yes"
                  : "no"
                : "n/a"}
            </div>
          </div>
          <div className="mb-1 font-bold">Debug: Figma Embed events</div>
          {debugEvents.length === 0 && <div className="opacity-60">Waiting for events…</div>}
          {debugEvents.map((e, i) => (
            <div key={i} className="border-t border-white/20 py-1">
              <div>type: {e.type}</div>
              <div>presentedNodeId: {String(e.presentedNodeId)}</div>
              <div>targetNodeId: {String(e.targetNodeId)}</div>
              <div>handled: {String(e.handled)}</div>
              <div>x/y: {String(e.x)}/{String(e.y)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
