-- Figma A/B usability testing tool — local SQLite schema

CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  task TEXT NOT NULL,
  figma_url_a TEXT NOT NULL,
  figma_url_b TEXT NOT NULL,
  target_a INTEGER,
  target_b INTEGER,
  success_node_a TEXT,
  success_node_b TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  device_type TEXT NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile')),
  template_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('a', 'b')),
  device_type TEXT NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('a', 'b')),
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  elapsed_ms INTEGER,
  presented_node_id TEXT,
  target_node_id TEXT,
  x REAL,
  y REAL,
  handled INTEGER,
  raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_test_id ON sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_events_test_id ON events(test_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);

-- ---------- A/B post-test question responses ----------

CREATE TABLE IF NOT EXISTS ab_responses (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('a', 'b')),
  question TEXT NOT NULL,
  response_text TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ab_responses_test_id ON ab_responses(test_id);

-- ---------- Usability testing ----------

CREATE TABLE IF NOT EXISTS usability_studies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  intro_instruction TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  device_type TEXT NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile')),
  final_question TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usability_steps (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES usability_studies(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  figma_url TEXT,
  success_node_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usability_questions (
  id TEXT PRIMARY KEY,
  step_id TEXT NOT NULL REFERENCES usability_steps(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'rating', 'single_choice', 'yes_no')),
  options_json TEXT,
  required INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS usability_sessions (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES usability_studies(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS usability_step_sessions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES usability_sessions(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL REFERENCES usability_steps(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS usability_responses (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES usability_sessions(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL REFERENCES usability_steps(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES usability_questions(id) ON DELETE CASCADE,
  text_response TEXT,
  numeric_response INTEGER,
  selected_option TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Separate from `events` (A/B-only, NOT NULL/CHECK-bound to test_id/variant) —
-- same column shape, scoped to usability studies/steps instead.
CREATE TABLE IF NOT EXISTS usability_events (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES usability_studies(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES usability_sessions(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL REFERENCES usability_steps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  elapsed_ms INTEGER,
  presented_node_id TEXT,
  target_node_id TEXT,
  x REAL,
  y REAL,
  handled INTEGER,
  raw_payload TEXT
);

-- Final, optional, whole-study feedback question — distinct from per-step
-- `usability_responses` (which FKs to a specific step_id/question_id and
-- can't host a study-level answer). Mirrors `ab_responses`' denormalized,
-- not-FK'd `question` column pattern.
CREATE TABLE IF NOT EXISTS usability_study_responses (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES usability_studies(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES usability_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  response_text TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usability_study_responses_study_id ON usability_study_responses(study_id);

CREATE INDEX IF NOT EXISTS idx_usability_steps_study_id ON usability_steps(study_id);
CREATE INDEX IF NOT EXISTS idx_usability_questions_step_id ON usability_questions(step_id);
CREATE INDEX IF NOT EXISTS idx_usability_sessions_study_id ON usability_sessions(study_id);
CREATE INDEX IF NOT EXISTS idx_usability_step_sessions_session_id ON usability_step_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_usability_step_sessions_step_id ON usability_step_sessions(step_id);
CREATE INDEX IF NOT EXISTS idx_usability_responses_session_id ON usability_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_usability_events_study_id ON usability_events(study_id);
CREATE INDEX IF NOT EXISTS idx_usability_events_session_id ON usability_events(session_id);

-- ---------- On-demand local AI insights cache (both study types) ----------

CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('ab', 'usability')),
  subject_id TEXT NOT NULL,
  report_json TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_insights_cache_subject ON ai_insights_cache(subject_type, subject_id);
