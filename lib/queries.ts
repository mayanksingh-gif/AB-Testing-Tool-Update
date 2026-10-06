import { randomUUID } from "crypto";
import { getDb } from "./db";
import { listUsabilityStudies, getUsabilityParticipantCount } from "./usability-queries";

// node:sqlite returns rows as null-prototype objects, which React Server
// Components can't serialize to Client Components. Spread into plain objects.
function toPlain<T>(row: T): T {
  return row == null ? row : ({ ...row } as T);
}
function toPlainAll<T>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row }));
}

export type Variant = "a" | "b";
export type DeviceType = "desktop" | "mobile";

export interface Test {
  id: string;
  name: string;
  task: string;
  figma_url_a: string;
  figma_url_b: string;
  target_a: number | null;
  target_b: number | null;
  success_node_a: string | null;
  success_node_b: string | null;
  status: string;
  device_type: DeviceType;
  template_id: string | null;
  post_test_question: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  test_id: string;
  variant: Variant;
  device_type: DeviceType;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: "in_progress" | "completed" | "abandoned";
}

export interface EventRow {
  id: string;
  test_id: string;
  session_id: string;
  variant: Variant;
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

// ---------- tests ----------

export function createTest(input: {
  name: string;
  task: string;
  figma_url_a: string;
  figma_url_b: string;
  target_a?: number | null;
  target_b?: number | null;
  success_node_a?: string | null;
  success_node_b?: string | null;
  status?: string;
  device_type?: DeviceType;
  template_id?: string | null;
  post_test_question?: string | null;
}): Test {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO tests (id, name, task, figma_url_a, figma_url_b, target_a, target_b, success_node_a, success_node_b, status, device_type, template_id, post_test_question)
     VALUES (@id, @name, @task, @figma_url_a, @figma_url_b, @target_a, @target_b, @success_node_a, @success_node_b, @status, @device_type, @template_id, @post_test_question)`
  ).run({
    id,
    name: input.name,
    task: input.task,
    figma_url_a: input.figma_url_a,
    figma_url_b: input.figma_url_b,
    target_a: input.target_a ?? null,
    target_b: input.target_b ?? null,
    success_node_a: input.success_node_a ?? null,
    success_node_b: input.success_node_b ?? null,
    status: input.status ?? "draft",
    device_type: input.device_type ?? "desktop",
    template_id: input.template_id ?? null,
    post_test_question: input.post_test_question ?? null,
  });
  return getTest(id) as Test;
}

export function getTest(id: string): Test | undefined {
  return toPlain(getDb().prepare(`SELECT * FROM tests WHERE id = ?`).get(id) as unknown as Test | undefined);
}

export function listTests(): Test[] {
  return toPlainAll(getDb().prepare(`SELECT * FROM tests ORDER BY created_at DESC`).all() as unknown as Test[]);
}

export function publishTest(id: string): void {
  getDb().prepare(`UPDATE tests SET status = 'published' WHERE id = ?`).run(id);
}

// Updates the test's configuration fields in place — the row's id, status,
// and created_at are untouched, so it remains "the same test." Callers are
// responsible for wiping results first (see wipeTestResults) when the
// configuration actually changed, per the edit-test flow's confirm step.
export function updateTest(
  id: string,
  input: {
    name: string;
    task: string;
    figma_url_a: string;
    figma_url_b: string;
    target_a?: number | null;
    target_b?: number | null;
    success_node_a?: string | null;
    success_node_b?: string | null;
    device_type?: DeviceType;
    post_test_question?: string | null;
  }
): void {
  const db = getDb();
  db.prepare(
    `UPDATE tests SET
       name = @name,
       task = @task,
       figma_url_a = @figma_url_a,
       figma_url_b = @figma_url_b,
       target_a = @target_a,
       target_b = @target_b,
       success_node_a = @success_node_a,
       success_node_b = @success_node_b,
       device_type = @device_type,
       post_test_question = @post_test_question
     WHERE id = @id`
  ).run({
    id,
    name: input.name,
    task: input.task,
    figma_url_a: input.figma_url_a,
    figma_url_b: input.figma_url_b,
    target_a: input.target_a ?? null,
    target_b: input.target_b ?? null,
    success_node_a: input.success_node_a ?? null,
    success_node_b: input.success_node_b ?? null,
    device_type: input.device_type ?? "desktop",
    post_test_question: input.post_test_question ?? null,
  });
}

// Deletes every piece of research data collected under a test's *previous*
// configuration: sessions (cascades to events and ab_responses via their
// ON DELETE CASCADE foreign keys — see lib/schema.sql) plus the AI insights
// cache, which has no FK relationship to tests and so never cascades
// automatically. The test row itself, and its configuration, is untouched.
export function wipeTestResults(testId: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM sessions WHERE test_id = ?`).run(testId);
  db.prepare(`DELETE FROM ai_insights_cache WHERE subject_type = 'ab' AND subject_id = ?`).run(testId);
}

// Copies only configuration fields into a brand-new test row (new id, fresh
// created_at, status reset to 'draft'). No sessions/events/ab_responses/cache
// rows are copied, so the duplicate starts with zero participants and empty
// results while the original test is left completely unmodified.
export function duplicateTest(testId: string): Test | undefined {
  const original = getTest(testId);
  if (!original) return undefined;
  return createTest({
    name: `${original.name} — Copy`,
    task: original.task,
    figma_url_a: original.figma_url_a,
    figma_url_b: original.figma_url_b,
    target_a: original.target_a,
    target_b: original.target_b,
    success_node_a: original.success_node_a,
    success_node_b: original.success_node_b,
    device_type: original.device_type,
    template_id: original.template_id,
    post_test_question: original.post_test_question,
  });
}

export function getParticipantCounts(testId: string): { a: number; b: number } {
  const db = getDb();
  const rows = toPlainAll(
    db
      .prepare(`SELECT variant, COUNT(*) as count FROM sessions WHERE test_id = ? GROUP BY variant`)
      .all(testId) as unknown as { variant: Variant; count: number }[]
  );
  const counts = { a: 0, b: 0 };
  for (const row of rows) counts[row.variant] = row.count;
  return counts;
}

// ---------- sessions ----------

export function createSession(testId: string, variant: Variant, deviceType: DeviceType = "desktop"): Session {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO sessions (id, test_id, variant, device_type, status) VALUES (?, ?, ?, ?, 'in_progress')`
  ).run(id, testId, variant, deviceType);
  return getSession(id) as Session;
}

export function getSession(id: string): Session | undefined {
  return toPlain(getDb().prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as unknown as Session | undefined);
}

export function completeSession(id: string): void {
  const db = getDb();
  const session = getSession(id);
  if (!session) return;
  // Compute duration in SQL (julianday, in UTC) to avoid JS local-timezone
  // parsing of SQLite's naive UTC datetime strings.
  db.prepare(
    `UPDATE sessions
     SET completed_at = datetime('now'),
         duration_ms = CAST((julianday(datetime('now')) - julianday(started_at)) * 86400000 AS INTEGER),
         status = 'completed'
     WHERE id = ?`
  ).run(id);
}

export function listSessionsForTest(testId: string, variant?: Variant): Session[] {
  const db = getDb();
  if (variant) {
    return toPlainAll(
      db
        .prepare(`SELECT * FROM sessions WHERE test_id = ? AND variant = ? ORDER BY started_at ASC`)
        .all(testId, variant) as unknown as Session[]
    );
  }
  return toPlainAll(
    db
      .prepare(`SELECT * FROM sessions WHERE test_id = ? ORDER BY started_at ASC`)
      .all(testId) as unknown as Session[]
  );
}

// ---------- events ----------

export function createEvent(input: {
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
}): EventRow {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO events (id, test_id, session_id, variant, event_type, elapsed_ms, presented_node_id, target_node_id, x, y, handled, raw_payload)
     VALUES (@id, @test_id, @session_id, @variant, @event_type, @elapsed_ms, @presented_node_id, @target_node_id, @x, @y, @handled, @raw_payload)`
  ).run({
    id,
    test_id: input.test_id,
    session_id: input.session_id,
    variant: input.variant,
    event_type: input.event_type,
    elapsed_ms: input.elapsed_ms ?? null,
    presented_node_id: input.presented_node_id ?? null,
    target_node_id: input.target_node_id ?? null,
    x: input.x ?? null,
    y: input.y ?? null,
    handled: input.handled === undefined || input.handled === null ? null : input.handled ? 1 : 0,
    raw_payload: input.raw_payload !== undefined ? JSON.stringify(input.raw_payload) : null,
  });
  return toPlain(getDb().prepare(`SELECT * FROM events WHERE id = ?`).get(id) as unknown as EventRow);
}

export function listEventsForSession(sessionId: string): EventRow[] {
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC, id ASC`)
      .all(sessionId) as unknown as EventRow[]
  );
}

export function listEventsForTest(testId: string, variant?: Variant): EventRow[] {
  const db = getDb();
  if (variant) {
    return toPlainAll(
      db
        .prepare(`SELECT * FROM events WHERE test_id = ? AND variant = ? ORDER BY timestamp ASC, id ASC`)
        .all(testId, variant) as unknown as EventRow[]
    );
  }
  return toPlainAll(
    db
      .prepare(`SELECT * FROM events WHERE test_id = ? ORDER BY timestamp ASC, id ASC`)
      .all(testId) as unknown as EventRow[]
  );
}

// ---------- A/B post-test responses ----------

export interface AbResponse {
  id: string;
  test_id: string;
  session_id: string;
  variant: Variant;
  question: string;
  response_text: string;
  submitted_at: string;
}

export function createAbResponse(input: {
  test_id: string;
  session_id: string;
  variant: Variant;
  question: string;
  response_text: string;
}): AbResponse {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO ab_responses (id, test_id, session_id, variant, question, response_text)
     VALUES (@id, @test_id, @session_id, @variant, @question, @response_text)`
  ).run({
    id,
    test_id: input.test_id,
    session_id: input.session_id,
    variant: input.variant,
    question: input.question,
    response_text: input.response_text,
  });
  return toPlain(getDb().prepare(`SELECT * FROM ab_responses WHERE id = ?`).get(id) as unknown as AbResponse);
}

export function listAbResponsesForTest(testId: string): AbResponse[] {
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM ab_responses WHERE test_id = ? ORDER BY submitted_at ASC`)
      .all(testId) as unknown as AbResponse[]
  );
}

// ---------- results ----------

export function getResultsForTest(testId: string) {
  const test = getTest(testId);
  const sessionsA = listSessionsForTest(testId, "a");
  const sessionsB = listSessionsForTest(testId, "b");
  const eventsA = listEventsForTest(testId, "a");
  const eventsB = listEventsForTest(testId, "b");
  return { test, sessionsA, sessionsB, eventsA, eventsB };
}

// ---------- combined study list (A/B + Usability) ----------

export type StudyType = "ab" | "usability";

export interface StudySummary {
  id: string;
  name: string;
  status: string;
  study_type: StudyType;
  created_at: string;
  participants: number;
  // A/B-only extras, kept optional so usability studies don't need them.
  task?: string;
  device_type?: string;
  variantCounts?: { a: number; b: number };
}

export function listAllStudies(): StudySummary[] {
  // Deliberately merged in JS rather than a SQL UNION across differently-
  // shaped tables — simpler to keep correct as each side evolves
  // independently. usability-queries.ts only imports from ./db, never from
  // this file, so importing it here carries no circular-import risk.
  const abStudies: StudySummary[] = listTests().map((t) => {
    const counts = getParticipantCounts(t.id);
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      study_type: "ab",
      created_at: t.created_at,
      participants: counts.a + counts.b,
      task: t.task,
      device_type: t.device_type,
      variantCounts: counts,
    };
  });

  const usabilityStudies: StudySummary[] = listUsabilityStudies().map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    study_type: "usability",
    created_at: s.created_at,
    participants: getUsabilityParticipantCount(s.id),
    // Usability studies have no "task" field of their own — description is
    // the closest analog (a one-line summary of what the study is about),
    // so the dashboard table's Task column isn't blank for this type.
    task: s.description ?? undefined,
    device_type: s.device_type,
  }));

  return [...abStudies, ...usabilityStudies].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ---------- AI insights cache (shared by A/B and usability) ----------

export type AiInsightSubjectType = "ab" | "usability";

export interface AiInsightsCacheRow {
  id: string;
  subject_type: AiInsightSubjectType;
  subject_id: string;
  report_json: string;
  generated_at: string;
}

export function getCachedAiInsights(
  subjectType: AiInsightSubjectType,
  subjectId: string
): AiInsightsCacheRow | undefined {
  return toPlain(
    getDb()
      .prepare(`SELECT * FROM ai_insights_cache WHERE subject_type = ? AND subject_id = ?`)
      .get(subjectType, subjectId) as unknown as AiInsightsCacheRow | undefined
  );
}

export function upsertAiInsightsCache(
  subjectType: AiInsightSubjectType,
  subjectId: string,
  reportJson: string
): AiInsightsCacheRow {
  const db = getDb();
  const existing = getCachedAiInsights(subjectType, subjectId);
  if (existing) {
    db.prepare(
      `UPDATE ai_insights_cache SET report_json = ?, generated_at = datetime('now') WHERE id = ?`
    ).run(reportJson, existing.id);
    return getCachedAiInsights(subjectType, subjectId) as AiInsightsCacheRow;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO ai_insights_cache (id, subject_type, subject_id, report_json) VALUES (?, ?, ?, ?)`
  ).run(id, subjectType, subjectId, reportJson);
  return getCachedAiInsights(subjectType, subjectId) as AiInsightsCacheRow;
}

// ---------- Figma node name cache (A/B results UI only) ----------

export interface FigmaNodeCacheRow {
  id: string;
  file_key: string;
  node_id: string;
  node_name: string | null;
  fallback_name: string | null;
  last_resolved_at: string;
}

export function getFigmaNodeCache(fileKey: string, nodeIds: string[]): FigmaNodeCacheRow[] {
  if (nodeIds.length === 0) return [];
  const placeholders = nodeIds.map(() => "?").join(", ");
  return toPlainAll(
    getDb()
      .prepare(`SELECT * FROM figma_nodes WHERE file_key = ? AND node_id IN (${placeholders})`)
      .all(fileKey, ...nodeIds) as unknown as FigmaNodeCacheRow[]
  );
}

export function upsertFigmaNodeName(fileKey: string, nodeId: string, nodeName: string): void {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM figma_nodes WHERE file_key = ? AND node_id = ?`)
    .get(fileKey, nodeId) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE figma_nodes SET node_name = ?, last_resolved_at = datetime('now') WHERE id = ?`
    ).run(nodeName, existing.id);
    return;
  }
  db.prepare(
    `INSERT INTO figma_nodes (id, file_key, node_id, node_name) VALUES (?, ?, ?, ?)`
  ).run(randomUUID(), fileKey, nodeId, nodeName);
}

// Assigns a permanent "Screen N" label the first time a node needs one,
// numbered by how many fallback names already exist for this file — so
// numbering is stable and consistent across renders/sessions once assigned.
export function assignFigmaFallbackName(fileKey: string, nodeId: string): string {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id, fallback_name FROM figma_nodes WHERE file_key = ? AND node_id = ?`)
    .get(fileKey, nodeId) as { id: string; fallback_name: string | null } | undefined;
  if (existing?.fallback_name) return existing.fallback_name;

  const { count } = db
    .prepare(`SELECT COUNT(*) as count FROM figma_nodes WHERE file_key = ? AND fallback_name IS NOT NULL`)
    .get(fileKey) as { count: number };
  const fallbackName = `Screen ${count + 1}`;

  if (existing) {
    db.prepare(
      `UPDATE figma_nodes SET fallback_name = ?, last_resolved_at = datetime('now') WHERE id = ?`
    ).run(fallbackName, existing.id);
  } else {
    db.prepare(
      `INSERT INTO figma_nodes (id, file_key, node_id, fallback_name) VALUES (?, ?, ?, ?)`
    ).run(randomUUID(), fileKey, nodeId, fallbackName);
  }
  return fallbackName;
}
