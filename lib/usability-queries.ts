import { randomUUID } from "crypto";
import { getDb } from "./db";

// Mirrors lib/queries.ts's conventions exactly (raw prepared statements,
// randomUUID ids, toPlain/toPlainAll for RSC serialization) but kept in its
// own file so the A/B code in lib/queries.ts / lib/actions.ts never has to
// change to support usability studies.
function toPlain<T>(row: T): T {
  return row == null ? row : ({ ...row } as T);
}
function toPlainAll<T>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row }));
}

export type DeviceType = "desktop" | "mobile";
export type QuestionType = "text" | "rating" | "single_choice" | "yes_no";

export interface UsabilityStudy {
  id: string;
  name: string;
  description: string | null;
  intro_instruction: string | null;
  status: string;
  device_type: DeviceType;
  final_question: string | null;
  created_at: string;
}

export interface UsabilityStep {
  id: string;
  study_id: string;
  step_order: number;
  title: string;
  instruction: string;
  figma_url: string | null;
  success_node_id: string | null;
  created_at: string;
}

export interface UsabilityQuestion {
  id: string;
  step_id: string;
  question_text: string;
  question_type: QuestionType;
  options_json: string | null;
  required: number;
}

export interface UsabilitySession {
  id: string;
  study_id: string;
  device_type: DeviceType;
  started_at: string;
  completed_at: string | null;
  status: "in_progress" | "completed" | "abandoned";
}

export interface UsabilityStepSession {
  id: string;
  session_id: string;
  step_id: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: "in_progress" | "completed" | "abandoned";
}

export interface UsabilityResponse {
  id: string;
  session_id: string;
  step_id: string;
  question_id: string;
  text_response: string | null;
  numeric_response: number | null;
  selected_option: string | null;
  submitted_at: string;
}

export interface UsabilityStudyResponse {
  id: string;
  study_id: string;
  session_id: string;
  question: string;
  response_text: string;
  submitted_at: string;
}

export interface UsabilityEventRow {
  id: string;
  study_id: string;
  session_id: string;
  step_id: string;
  event_type: string;
  timestamp: string;
  elapsed_ms: number | null;
  presented_node_id: string | null;
  target_node_id: string | null;
  x: number | null;
  y: number | null;
  handled: number | null;
  raw_payload: string | null;
}

// ---------- studies ----------

export function createUsabilityStudy(input: {
  name: string;
  description?: string | null;
  intro_instruction?: string | null;
  device_type?: DeviceType;
  final_question?: string | null;
}): UsabilityStudy {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO usability_studies (id, name, description, intro_instruction, status, device_type, final_question)
     VALUES (@id, @name, @description, @intro_instruction, 'draft', @device_type, @final_question)`
  ).run({
    id,
    name: input.name,
    description: input.description ?? null,
    intro_instruction: input.intro_instruction ?? null,
    device_type: input.device_type ?? "desktop",
    final_question: input.final_question ?? null,
  });
  return getUsabilityStudy(id) as UsabilityStudy;
}

export function getUsabilityStudy(id: string): UsabilityStudy | undefined {
  return toPlain(
    getDb().prepare(`SELECT * FROM usability_studies WHERE id = ?`).get(id) as unknown as UsabilityStudy | undefined
  );
}

export function updateUsabilityStudy(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    intro_instruction?: string | null;
    device_type?: DeviceType;
    final_question?: string | null;
  }
): void {
  const db = getDb();
  const current = getUsabilityStudy(id);
  if (!current) return;
  db.prepare(
    `UPDATE usability_studies SET name = @name, description = @description, intro_instruction = @intro_instruction, device_type = @device_type, final_question = @final_question WHERE id = @id`
  ).run({
    id,
    name: input.name ?? current.name,
    description: input.description !== undefined ? input.description : current.description,
    intro_instruction: input.intro_instruction !== undefined ? input.intro_instruction : current.intro_instruction,
    device_type: input.device_type ?? current.device_type,
    final_question: input.final_question !== undefined ? input.final_question : current.final_question,
  });
}

export function listUsabilityStudies(): UsabilityStudy[] {
  return toPlainAll(
    getDb().prepare(`SELECT * FROM usability_studies ORDER BY created_at DESC`).all() as unknown as UsabilityStudy[]
  );
}

export function publishUsabilityStudy(id: string): void {
  getDb().prepare(`UPDATE usability_studies SET status = 'published' WHERE id = ?`).run(id);
}

export function getUsabilityParticipantCount(studyId: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) as count FROM usability_sessions WHERE study_id = ?`)
    .get(studyId) as { count: number } | undefined;
  return row?.count ?? 0;
}

// ---------- steps ----------

export function createUsabilityStep(input: {
  study_id: string;
  title: string;
  instruction: string;
  figma_url?: string | null;
  success_node_id?: string | null;
}): UsabilityStep {
  const db = getDb();
  const id = randomUUID();
  const maxOrder = db
    .prepare(`SELECT COALESCE(MAX(step_order), -1) as maxOrder FROM usability_steps WHERE study_id = ?`)
    .get(input.study_id) as { maxOrder: number };
  db.prepare(
    `INSERT INTO usability_steps (id, study_id, step_order, title, instruction, figma_url, success_node_id)
     VALUES (@id, @study_id, @step_order, @title, @instruction, @figma_url, @success_node_id)`
  ).run({
    id,
    study_id: input.study_id,
    step_order: maxOrder.maxOrder + 1,
    title: input.title,
    instruction: input.instruction,
    figma_url: input.figma_url ?? null,
    success_node_id: input.success_node_id ?? null,
  });
  return getUsabilityStep(id) as UsabilityStep;
}

export function getUsabilityStep(id: string): UsabilityStep | undefined {
  return toPlain(
    getDb().prepare(`SELECT * FROM usability_steps WHERE id = ?`).get(id) as unknown as UsabilityStep | undefined
  );
}

export function updateUsabilityStep(
  id: string,
  input: { title?: string; instruction?: string; figma_url?: string | null; success_node_id?: string | null }
): void {
  const db = getDb();
  const current = getUsabilityStep(id);
  if (!current) return;
  db.prepare(
    `UPDATE usability_steps SET title = @title, instruction = @instruction, figma_url = @figma_url, success_node_id = @success_node_id WHERE id = @id`
  ).run({
    id,
    title: input.title ?? current.title,
    instruction: input.instruction ?? current.instruction,
    figma_url: input.figma_url !== undefined ? input.figma_url : current.figma_url,
    success_node_id: input.success_node_id !== undefined ? input.success_node_id : current.success_node_id,
  });
}

export function deleteUsabilityStep(id: string): void {
  getDb().prepare(`DELETE FROM usability_steps WHERE id = ?`).run(id);
}

export function listUsabilityStepsForStudy(studyId: string): UsabilityStep[] {
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM usability_steps WHERE study_id = ? ORDER BY step_order ASC`)
      .all(studyId) as unknown as UsabilityStep[]
  );
}

// Swaps step_order between two adjacent steps — the only "reorder" operation
// the UI needs (Move up / Move down), so no general-purpose reindex is built.
export function swapUsabilityStepOrder(stepIdA: string, stepIdB: string): void {
  const db = getDb();
  const a = getUsabilityStep(stepIdA);
  const b = getUsabilityStep(stepIdB);
  if (!a || !b) return;
  db.prepare(`UPDATE usability_steps SET step_order = ? WHERE id = ?`).run(b.step_order, a.id);
  db.prepare(`UPDATE usability_steps SET step_order = ? WHERE id = ?`).run(a.step_order, b.id);
}

// ---------- questions ----------

export function createUsabilityQuestion(input: {
  step_id: string;
  question_text: string;
  question_type: QuestionType;
  options?: string[] | null;
  required?: boolean;
}): UsabilityQuestion {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO usability_questions (id, step_id, question_text, question_type, options_json, required)
     VALUES (@id, @step_id, @question_text, @question_type, @options_json, @required)`
  ).run({
    id,
    step_id: input.step_id,
    question_text: input.question_text,
    question_type: input.question_type,
    options_json: input.options && input.options.length > 0 ? JSON.stringify(input.options) : null,
    required: input.required ? 1 : 0,
  });
  return toPlain(
    getDb().prepare(`SELECT * FROM usability_questions WHERE id = ?`).get(id) as unknown as UsabilityQuestion
  );
}

export function updateUsabilityQuestion(
  id: string,
  input: { question_text?: string; question_type?: QuestionType; options?: string[] | null; required?: boolean }
): void {
  const db = getDb();
  const current = toPlain(
    db.prepare(`SELECT * FROM usability_questions WHERE id = ?`).get(id) as unknown as UsabilityQuestion | undefined
  );
  if (!current) return;
  db.prepare(
    `UPDATE usability_questions SET question_text = @question_text, question_type = @question_type, options_json = @options_json, required = @required WHERE id = @id`
  ).run({
    id,
    question_text: input.question_text ?? current.question_text,
    question_type: input.question_type ?? current.question_type,
    options_json:
      input.options !== undefined
        ? input.options && input.options.length > 0
          ? JSON.stringify(input.options)
          : null
        : current.options_json,
    required: input.required !== undefined ? (input.required ? 1 : 0) : current.required,
  });
}

export function deleteUsabilityQuestion(id: string): void {
  getDb().prepare(`DELETE FROM usability_questions WHERE id = ?`).run(id);
}

export function listUsabilityQuestionsForStep(stepId: string): UsabilityQuestion[] {
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM usability_questions WHERE step_id = ?`)
      .all(stepId) as unknown as UsabilityQuestion[]
  );
}

export function listUsabilityQuestionsForStudy(studyId: string): UsabilityQuestion[] {
  return toPlainAll(
    getDb()
      .prepare(
        `SELECT q.* FROM usability_questions q
         JOIN usability_steps s ON s.id = q.step_id
         WHERE s.study_id = ? ORDER BY s.step_order ASC`
      )
      .all(studyId) as unknown as UsabilityQuestion[]
  );
}

// ---------- sessions ----------

export function createUsabilitySession(studyId: string, deviceType: DeviceType = "desktop"): UsabilitySession {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO usability_sessions (id, study_id, device_type, status) VALUES (?, ?, ?, 'in_progress')`
  ).run(id, studyId, deviceType);
  return getUsabilitySession(id) as UsabilitySession;
}

export function getUsabilitySession(id: string): UsabilitySession | undefined {
  return toPlain(
    getDb().prepare(`SELECT * FROM usability_sessions WHERE id = ?`).get(id) as unknown as
      | UsabilitySession
      | undefined
  );
}

export function completeUsabilitySession(id: string): void {
  getDb()
    .prepare(`UPDATE usability_sessions SET completed_at = datetime('now'), status = 'completed' WHERE id = ?`)
    .run(id);
}

export function listUsabilitySessionsForStudy(studyId: string): UsabilitySession[] {
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM usability_sessions WHERE study_id = ? ORDER BY started_at ASC`)
      .all(studyId) as unknown as UsabilitySession[]
  );
}

// ---------- step sessions ----------

export function createUsabilityStepSession(sessionId: string, stepId: string): UsabilityStepSession {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO usability_step_sessions (id, session_id, step_id, status) VALUES (?, ?, ?, 'in_progress')`
  ).run(id, sessionId, stepId);
  return toPlain(
    db.prepare(`SELECT * FROM usability_step_sessions WHERE id = ?`).get(id) as unknown as UsabilityStepSession
  );
}

export function completeUsabilityStepSession(id: string, status: "completed" | "abandoned" = "completed"): void {
  const db = getDb();
  db.prepare(
    `UPDATE usability_step_sessions
     SET completed_at = datetime('now'),
         duration_ms = CAST((julianday(datetime('now')) - julianday(started_at)) * 86400000 AS INTEGER),
         status = ?
     WHERE id = ?`
  ).run(status, id);
}

export function listUsabilityStepSessionsForSession(sessionId: string): UsabilityStepSession[] {
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM usability_step_sessions WHERE session_id = ? ORDER BY started_at ASC`)
      .all(sessionId) as unknown as UsabilityStepSession[]
  );
}

export function listUsabilityStepSessionsForStudy(studyId: string): UsabilityStepSession[] {
  return toPlainAll(
    getDb()
      .prepare(
        `SELECT ss.* FROM usability_step_sessions ss
         JOIN usability_sessions s ON s.id = ss.session_id
         WHERE s.study_id = ? ORDER BY ss.started_at ASC`
      )
      .all(studyId) as unknown as UsabilityStepSession[]
  );
}

// ---------- responses ----------

export function createUsabilityResponse(input: {
  session_id: string;
  step_id: string;
  question_id: string;
  text_response?: string | null;
  numeric_response?: number | null;
  selected_option?: string | null;
}): UsabilityResponse {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO usability_responses (id, session_id, step_id, question_id, text_response, numeric_response, selected_option)
     VALUES (@id, @session_id, @step_id, @question_id, @text_response, @numeric_response, @selected_option)`
  ).run({
    id,
    session_id: input.session_id,
    step_id: input.step_id,
    question_id: input.question_id,
    text_response: input.text_response ?? null,
    numeric_response: input.numeric_response ?? null,
    selected_option: input.selected_option ?? null,
  });
  return toPlain(
    db.prepare(`SELECT * FROM usability_responses WHERE id = ?`).get(id) as unknown as UsabilityResponse
  );
}

export function listUsabilityResponsesForStudy(studyId: string): UsabilityResponse[] {
  return toPlainAll(
    getDb()
      .prepare(
        `SELECT r.* FROM usability_responses r
         JOIN usability_sessions s ON s.id = r.session_id
         WHERE s.study_id = ? ORDER BY r.submitted_at ASC`
      )
      .all(studyId) as unknown as UsabilityResponse[]
  );
}

export function listUsabilityResponsesForSession(sessionId: string): UsabilityResponse[] {
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM usability_responses WHERE session_id = ? ORDER BY submitted_at ASC`)
      .all(sessionId) as unknown as UsabilityResponse[]
  );
}

// ---------- study-level (final) responses ----------
// Mirrors createAbResponse/listAbResponsesForTest in lib/queries.ts — kept
// separate from per-step usability_responses since that table's step_id/
// question_id FKs are NOT NULL and can't host a whole-study answer.

export function createUsabilityStudyResponse(input: {
  study_id: string;
  session_id: string;
  question: string;
  response_text: string;
}): UsabilityStudyResponse {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO usability_study_responses (id, study_id, session_id, question, response_text)
     VALUES (@id, @study_id, @session_id, @question, @response_text)`
  ).run({
    id,
    study_id: input.study_id,
    session_id: input.session_id,
    question: input.question,
    response_text: input.response_text,
  });
  return toPlain(
    db.prepare(`SELECT * FROM usability_study_responses WHERE id = ?`).get(id) as unknown as UsabilityStudyResponse
  );
}

export function listUsabilityStudyResponsesForStudy(studyId: string): UsabilityStudyResponse[] {
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM usability_study_responses WHERE study_id = ? ORDER BY submitted_at ASC`)
      .all(studyId) as unknown as UsabilityStudyResponse[]
  );
}

// ---------- events ----------

export function createUsabilityEvent(input: {
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
}): UsabilityEventRow {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO usability_events (id, study_id, session_id, step_id, event_type, elapsed_ms, presented_node_id, target_node_id, x, y, handled, raw_payload)
     VALUES (@id, @study_id, @session_id, @step_id, @event_type, @elapsed_ms, @presented_node_id, @target_node_id, @x, @y, @handled, @raw_payload)`
  ).run({
    id,
    study_id: input.study_id,
    session_id: input.session_id,
    step_id: input.step_id,
    event_type: input.event_type,
    elapsed_ms: input.elapsed_ms ?? null,
    presented_node_id: input.presented_node_id ?? null,
    target_node_id: input.target_node_id ?? null,
    x: input.x ?? null,
    y: input.y ?? null,
    handled: input.handled === undefined || input.handled === null ? null : input.handled ? 1 : 0,
    raw_payload: input.raw_payload !== undefined ? JSON.stringify(input.raw_payload) : null,
  });
  return toPlain(
    getDb().prepare(`SELECT * FROM usability_events WHERE id = ?`).get(id) as unknown as UsabilityEventRow
  );
}

export function listUsabilityEventsForSession(sessionId: string): UsabilityEventRow[] {
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM usability_events WHERE session_id = ? ORDER BY timestamp ASC, id ASC`)
      .all(sessionId) as unknown as UsabilityEventRow[]
  );
}

export function listUsabilityEventsForStudy(studyId: string): UsabilityEventRow[] {
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM usability_events WHERE study_id = ? ORDER BY timestamp ASC, id ASC`)
      .all(studyId) as unknown as UsabilityEventRow[]
  );
}

// ---------- results aggregate ----------

export function getResultsForUsabilityStudy(studyId: string) {
  const study = getUsabilityStudy(studyId);
  const steps = listUsabilityStepsForStudy(studyId);
  const questions = listUsabilityQuestionsForStudy(studyId);
  const sessions = listUsabilitySessionsForStudy(studyId);
  const stepSessions = listUsabilityStepSessionsForStudy(studyId);
  const responses = listUsabilityResponsesForStudy(studyId);
  const events = listUsabilityEventsForStudy(studyId);
  const studyResponses = listUsabilityStudyResponsesForStudy(studyId);
  return { study, steps, questions, sessions, stepSessions, responses, events, studyResponses };
}
