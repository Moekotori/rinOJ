CREATE TYPE submission_status AS ENUM (
  'queued',
  'compiling',
  'running',
  'accepted',
  'wrong_answer',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'runtime_error',
  'compile_error',
  'system_error'
);

CREATE TABLE IF NOT EXISTS submissions (
  submission_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  contest_id TEXT NOT NULL DEFAULT '',
  language_id TEXT NOT NULL,
  status submission_status NOT NULL,
  score BIGINT NOT NULL DEFAULT 0,
  source_object_key TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (submission_id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS submissions_default
  PARTITION OF submissions DEFAULT;

CREATE INDEX IF NOT EXISTS idx_submissions_actor_created
  ON submissions (actor_id, created_at DESC, submission_id DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_problem_created
  ON submissions (problem_id, created_at DESC, submission_id DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_contest_created
  ON submissions (contest_id, created_at DESC, submission_id DESC)
  WHERE contest_id <> '';

CREATE INDEX IF NOT EXISTS idx_submissions_created
  ON submissions (created_at DESC, submission_id DESC);

CREATE TABLE IF NOT EXISTS submission_events (
  event_id BIGSERIAL PRIMARY KEY,
  submission_id TEXT NOT NULL,
  status submission_status NOT NULL,
  test_case_index INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT '',
  time_ms BIGINT NOT NULL DEFAULT 0,
  memory_bytes BIGINT NOT NULL DEFAULT 0,
  final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_events_submission_created
  ON submission_events (submission_id, created_at ASC);
