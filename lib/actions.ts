"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as db from "./queries";
import type { DeviceType, Variant } from "./queries";
import { parseSuccessLink } from "./figma";
import { computeVariantMetrics } from "./metrics";
import { generateInsights } from "./insights";
import { buildAbInsightsPayload, generateInsightsReport } from "./ai-insights";

export async function createTestAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const task = String(formData.get("task") ?? "").trim();
  const figma_url_a = String(formData.get("figma_url_a") ?? "").trim();
  const figma_url_b = String(formData.get("figma_url_b") ?? "").trim();
  const target_a = formData.get("target_a") ? Number(formData.get("target_a")) : null;
  const target_b = formData.get("target_b") ? Number(formData.get("target_b")) : null;
  const success_link_a = String(formData.get("success_link_a") ?? "").trim();
  const success_link_b = String(formData.get("success_link_b") ?? "").trim();
  const success_node_a = success_link_a ? parseSuccessLink(success_link_a) : null;
  const success_node_b = success_link_b ? parseSuccessLink(success_link_b) : null;
  const device_type: DeviceType = formData.get("device_type") === "mobile" ? "mobile" : "desktop";
  const template_id = String(formData.get("template_id") ?? "").trim() || null;
  const post_test_question = String(formData.get("post_test_question") ?? "").trim() || null;

  if (!name || !task || !figma_url_a || !figma_url_b) {
    throw new Error("Name, task, and both prototype URLs are required.");
  }
  if (success_link_a && !success_node_a) {
    throw new Error("Variant A final screen link doesn't contain a node-id — paste the link from the Figma prototype's Present view.");
  }
  if (success_link_b && !success_node_b) {
    throw new Error("Variant B final screen link doesn't contain a node-id — paste the link from the Figma prototype's Present view.");
  }

  const test = db.createTest({
    name,
    task,
    figma_url_a,
    figma_url_b,
    target_a,
    target_b,
    success_node_a,
    success_node_b,
    device_type,
    template_id,
    post_test_question,
  });

  redirect(`/tests/${test.id}`);
}

export async function publishTestAction(testId: string) {
  db.publishTest(testId);
  revalidatePath(`/tests/${testId}`);
  revalidatePath("/");
}

// Saves edits to an existing test's configuration. The caller (the edit form,
// via ConfirmResetModal) is responsible for having the researcher confirm the
// results-reset first — this action always wipes results as soon as it runs,
// since by the time it's called that confirmation has already happened.
export async function updateTestAction(testId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const task = String(formData.get("task") ?? "").trim();
  const figma_url_a = String(formData.get("figma_url_a") ?? "").trim();
  const figma_url_b = String(formData.get("figma_url_b") ?? "").trim();
  const target_a = formData.get("target_a") ? Number(formData.get("target_a")) : null;
  const target_b = formData.get("target_b") ? Number(formData.get("target_b")) : null;
  const success_link_a = String(formData.get("success_link_a") ?? "").trim();
  const success_link_b = String(formData.get("success_link_b") ?? "").trim();
  const success_node_a = success_link_a ? parseSuccessLink(success_link_a) : null;
  const success_node_b = success_link_b ? parseSuccessLink(success_link_b) : null;
  const device_type: DeviceType = formData.get("device_type") === "mobile" ? "mobile" : "desktop";
  const post_test_question = String(formData.get("post_test_question") ?? "").trim() || null;

  if (!name || !task || !figma_url_a || !figma_url_b) {
    throw new Error("Name, task, and both prototype URLs are required.");
  }
  if (success_link_a && !success_node_a) {
    throw new Error("Variant A final screen link doesn't contain a node-id — paste the link from the Figma prototype's Present view.");
  }
  if (success_link_b && !success_node_b) {
    throw new Error("Variant B final screen link doesn't contain a node-id — paste the link from the Figma prototype's Present view.");
  }

  db.wipeTestResults(testId);
  db.updateTest(testId, {
    name,
    task,
    figma_url_a,
    figma_url_b,
    target_a,
    target_b,
    success_node_a,
    success_node_b,
    device_type,
    post_test_question,
  });

  revalidatePath(`/tests/${testId}`);
  revalidatePath(`/tests/${testId}/results`);
  revalidatePath("/");
  redirect(`/tests/${testId}`);
}

// Duplicates only the configuration of an existing test into a brand-new
// test row, then sends the researcher straight into editing it.
export async function duplicateTestAction(testId: string) {
  const copy = db.duplicateTest(testId);
  if (!copy) throw new Error("Test not found.");
  revalidatePath("/");
  redirect(`/tests/${copy.id}/edit`);
}

export async function startSessionAction(testId: string, variant: Variant, deviceType: DeviceType = "desktop") {
  return db.createSession(testId, variant, deviceType);
}

export async function completeSessionAction(sessionId: string) {
  db.completeSession(sessionId);
}

export async function logEventAction(input: {
  test_id: string;
  session_id: string;
  variant: Variant;
  event_type: string;
  elapsed_ms?: number | null;
  presented_node_id?: string | null;
  target_node_id?: string | null;
  x?: number | null;
  y?: number | null;
  handled?: boolean | null;
  raw_payload?: unknown;
}) {
  db.createEvent(input);
}

export async function submitAbResponseAction(input: {
  test_id: string;
  session_id: string;
  variant: Variant;
  question: string;
  response_text: string;
}) {
  db.createAbResponse(input);
}

// ---------- On-demand AI insights (A/B) ----------
// Never called automatically — only from the "Generate/Refresh Insights"
// button in AiInsightsSection. Failure (local server down, bad JSON) is
// returned as a normal result, never thrown, so the results page can't crash.

export async function generateAbInsightsAction(testId: string) {
  const { test, sessionsA, sessionsB, eventsA, eventsB } = db.getResultsForTest(testId);
  if (!test) return { ok: false as const, error: "Test not found." };

  const metricsA = computeVariantMetrics(sessionsA, eventsA);
  const metricsB = computeVariantMetrics(sessionsB, eventsB);
  const ruleBasedInsights = generateInsights(metricsA, metricsB, sessionsA, sessionsB, eventsA, eventsB);
  const feedback = db.listAbResponsesForTest(testId);

  const payload = buildAbInsightsPayload({
    testName: test.name,
    task: test.task,
    metricsA,
    metricsB,
    ruleBasedInsights,
    feedback,
  });

  const result = await generateInsightsReport(payload);
  if (!result.ok) return result;

  db.upsertAiInsightsCache("ab", testId, JSON.stringify(result.report));
  return result;
}

export async function getCachedAiInsightsAction(subjectType: "ab" | "usability", subjectId: string) {
  const cached = db.getCachedAiInsights(subjectType, subjectId);
  if (!cached) return null;
  try {
    return JSON.parse(cached.report_json);
  } catch {
    return null;
  }
}
