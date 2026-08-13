CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE scheduled_task_status AS ENUM ('RUNNING', 'PAUSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE task_execution_status AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE task_trigger_type AS ENUM ('SCHEDULED', 'MANUAL_RUN_NOW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(240) NOT NULL,
  description text NOT NULL DEFAULT '',
  cron_expression varchar(120) NOT NULL,
  human_schedule varchar(240) NOT NULL,
  status scheduled_task_status NOT NULL DEFAULT 'RUNNING',
  owner_id uuid,
  channel_ids text[] NOT NULL DEFAULT '{}',
  system_prompt text NOT NULL DEFAULT '',
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_run_status task_execution_status,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_tasks_due_idx ON scheduled_tasks (next_run_at) WHERE status = 'RUNNING';
CREATE INDEX IF NOT EXISTS scheduled_tasks_status_idx ON scheduled_tasks (status);

CREATE TABLE IF NOT EXISTS task_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
  trigger_type task_trigger_type NOT NULL,
  status task_execution_status NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  result_summary text NOT NULL DEFAULT '',
  error_message text,
  execution_payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS task_execution_logs_task_time_idx ON task_execution_logs (task_id, executed_at DESC);
