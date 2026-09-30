"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as db from "./usability-queries";
import { upsertAiInsightsCache, getCachedAiInsights } from "./queries";
import type { DeviceType, QuestionType } from "./usability-queries";
import { parseSuccessLink, isValidFigmaUrl } from "./figma";
import { buildUsabilityInsightsPayload, generateInsightsReport } from "./ai-insights";
import { computeUsabilityOverview, computeStepAnalysis, rankFrictionSteps, summarizeQuestions } from "./usability-metrics";

// ---------- study CRUD ----------

export async function createUsabilityStudyAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const intro_instruction = String(formData.get("intro_instruction") ?? "").trim() || null;
  const device_type: DeviceType = formData.get("device_type") === "mobile" ? "mobile" : "desktop";
  const final_question = String(formData.get("final_question") ?? "").trim() || null;

  if (!name) {
    throw new Error("Study name is required.");
  }

  const study = db.createUsabilityStudy({ name, description, intro_instruction, device_type, final_question });
  redirect(`/studies/${study.id}/edit`);
}

export async function updateUsabilityStudyAction(
  studyId: string,
  input: {
    name?: string;
    description?: string | null;
    intro_instruction?: string | null;
    device_type?: DeviceType;
    final_question?: string | null;
  }
) {
  db.updateUsabilityStudy(studyId, input);
  revalidatePath(`/studies/${studyId}`);
  revalidatePath(`/studies/${studyId}/edit`);
}

export async function publishUsabilityStudyAction(studyId: string) {
  const steps = db.listUsabilityStepsForStudy(studyId);
  if (steps.length === 0) {
    throw new Error("Add at least one step before publishing.");
  }
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step.figma_url || !step.success_node_id) {
      throw new Error(
        `Step ${i + 1} is incomplete. Add both the starting and final Figma screen URLs.`
      );
    }
  }
  db.publishUsabilityStudy(studyId);
  revalidatePath(`/studies/${studyId}`);
  revalidatePath("/");
}

// ---------- step CRUD ----------

export async function createUsabilityStepAction(formData: FormData) {
  const study_id = String(formData.get("study_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const instruction = String(formData.get("instruction") ?? "").trim();
  const figma_url = String(formData.get("figma_url") ?? "").trim();
  const success_link = String(formData.get("success_link") ?? "").trim();

  if (!study_id || !title || !instruction) {
    throw new Error("Step title and instruction are required.");
  }
  if (!figma_url) {
    throw new Error("Starting Figma URL is required.");
  }
  if (!isValidFigmaUrl(figma_url)) {
    throw new Error("Starting Figma URL doesn't look like a valid Figma link.");
  }
  if (!success_link) {
    throw new Error("Final screen Figma URL is required.");
  }
  const success_node_id = parseSuccessLink(success_link);
  if (!success_node_id) {
    throw new Error("Final screen Figma URL doesn't contain a node-id — paste the link from the Figma prototype's Present view.");
  }

  db.createUsabilityStep({ study_id, title, instruction, figma_url, success_node_id });
  revalidatePath(`/studies/${study_id}/edit`);
}

export async function updateUsabilityStepAction(
  stepId: string,
  studyId: string,
  input: { title?: string; instruction?: string; figma_url?: string | null; success_link?: string }
) {
  if (input.figma_url !== undefined) {
    const figma_url = (input.figma_url ?? "").trim();
    if (!figma_url) {
      throw new Error("Starting Figma URL is required.");
    }
    if (!isValidFigmaUrl(figma_url)) {
      throw new Error("Starting Figma URL doesn't look like a valid Figma link.");
    }
  }

  let success_node_id: string | null | undefined;
  if (input.success_link !== undefined) {
    const success_link = input.success_link.trim();
    if (!success_link) {
      throw new Error("Final screen Figma URL is required.");
    }
    success_node_id = parseSuccessLink(success_link);
    if (!success_node_id) {
      throw new Error("Final screen Figma URL doesn't contain a node-id — paste the link from the Figma prototype's Present view.");
    }
  }

  db.updateUsabilityStep(stepId, {
    title: input.title,
    instruction: input.instruction,
    figma_url: input.figma_url,
    success_node_id,
  });
  revalidatePath(`/studies/${studyId}/edit`);
}

export async function deleteUsabilityStepAction(stepId: string, studyId: string) {
  db.deleteUsabilityStep(stepId);
  revalidatePath(`/studies/${studyId}/edit`);
}

export async function reorderStepAction(stepId: string, studyId: string, direction: "up" | "down") {
  const steps = db.listUsabilityStepsForStudy(studyId);
  const index = steps.findIndex((s) => s.id === stepId);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= steps.length) return;
  db.swapUsabilityStepOrder(steps[index].id, steps[swapIndex].id);
  revalidatePath(`/studies/${studyId}/edit`);
}

// ---------- question CRUD ----------

export async function createUsabilityQuestionAction(formData: FormData) {
  const step_id = String(formData.get("step_id") ?? "").trim();
  const study_id = String(formData.get("study_id") ?? "").trim();
  const question_text = String(formData.get("question_text") ?? "").trim();
  const question_type = String(formData.get("question_type") ?? "text") as QuestionType;
  const optionsRaw = String(formData.get("options") ?? "").trim();
  const options = optionsRaw
    ? optionsRaw
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean)
    : null;
  const required = formData.get("required") === "on";

  if (!step_id || !question_text) {
    throw new Error("Question text is required.");
  }
  if (question_type === "single_choice" && (!options || options.length < 2)) {
    throw new Error("Single-choice questions need at least two options, one per line.");
  }

  db.createUsabilityQuestion({ step_id, question_text, question_type, options, required });
  revalidatePath(`/studies/${study_id}/edit`);
}

export async function updateUsabilityQuestionAction(
  questionId: string,
  studyId: string,
  input: { question_text?: string; question_type?: QuestionType; options?: string[] | null; required?: boolean }
) {
  db.updateUsabilityQuestion(questionId, input);
  revalidatePath(`/studies/${studyId}/edit`);
}

export async function deleteUsabilityQuestionAction(questionId: string, studyId: string) {
  db.deleteUsabilityQuestion(questionId);
  revalidatePath(`/studies/${studyId}/edit`);
}

// ---------- participant experience ----------

export async function startUsabilitySessionAction(studyId: string, deviceType: DeviceType = "desktop") {
  return db.createUsabilitySession(studyId, deviceType);
}

export async function startUsabilityStepSessionAction(sessionId: string, stepId: string) {
  return db.createUsabilityStepSession(sessionId, stepId);
}

export async function completeUsabilityStepSessionAction(
  stepSessionId: string,
  status: "completed" | "abandoned" = "completed"
) {
  db.completeUsabilityStepSession(stepSessionId, status);
}

export async function completeUsabilitySessionAction(sessionId: string) {
  db.completeUsabilitySession(sessionId);
}

export async function submitUsabilityResponseAction(input: {
  session_id: string;
  step_id: string;
  question_id: string;
  text_response?: string | null;
  numeric_response?: number | null;
  selected_option?: string | null;
}) {
  db.createUsabilityResponse(input);
}

// Final, optional, whole-study feedback question — submitted once, after the
// last step (and its step question, if any) is complete, before the
// completion screen. Mirrors submitAbResponseAction's shape/pass-through.
export async function submitUsabilityStudyResponseAction(input: {
  study_id: string;
  session_id: string;
  question: string;
  response_text: string;
}) {
  db.createUsabilityStudyResponse(input);
}

// Mirrors logEventAction's shape exactly — this is what FigmaEmbed's new
// optional onLogEvent prop points at for usability steps. The origin/source
// validation inside FigmaEmbed itself never changes; this only receives
// whatever it already decided was safe to hand off.
export async function logUsabilityEventAction(input: {
  study_id: string;
  session_id: string;
  step_id: string;
  event_type: string;
  elapsed_ms?: number | null;
  presented_node_id?: string | null;
  target_node_id?: string | null;
  x?: number | null;
  y?: number | null;
  handled?: boolean | null;
  raw_payload?: unknown;
}) {
  db.createUsabilityEvent(input);
}

// ---------- On-demand AI insights (Usability) ----------
// Same never-automatic, never-throws contract as generateAbInsightsAction.

export async function generateUsabilityInsightsAction(studyId: string) {
  const { study, steps, questions, sessions, stepSessions, responses, events, studyResponses } =
    db.getResultsForUsabilityStudy(studyId);
  if (!study) return { ok: false as const, error: "Study not found." };

  const overview = computeUsabilityOverview(sessions, stepSessions, steps);
  const perStep = computeStepAnalysis(steps, stepSessions, events);
  const frictionRanking = rankFrictionSteps(perStep);
  const questionSummaries = summarizeQuestions(questions, responses);
  const textFeedback = responses
    .filter((r) => r.text_response)
    .map((r) => r.text_response as string);
  // Kept separate from per-step textFeedback — this is the whole-study final
  // question, not tied to any one step/question_id.
  const finalFeedback = studyResponses.map((r) => r.response_text);

  const payload = buildUsabilityInsightsPayload({
    studyName: study.name,
    overview,
    perStep,
    frictionRanking,
    questionSummaries,
    textFeedback,
    finalFeedback,
  });

  const result = await generateInsightsReport(payload);
  if (!result.ok) return result;

  upsertAiInsightsCache("usability", studyId, JSON.stringify(result.report));
  return result;
}

export async function getCachedUsabilityInsightsAction(studyId: string) {
  const cached = getCachedAiInsights("usability", studyId);
  if (!cached) return null;
  try {
    return JSON.parse(cached.report_json);
  } catch {
    return null;
  }
}
