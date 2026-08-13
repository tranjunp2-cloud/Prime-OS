CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN CREATE TYPE finance_source_type AS ENUM ('COMMERCE_ORDER', 'SERVICE_BOOKING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE receivable_status AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'DISPUTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE receivable_aging_bucket AS ENUM ('DUE_TODAY', 'OVERDUE_1_7', 'OVERDUE_8_30', 'OVERDUE_30_PLUS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE finance_risk_type AS ENUM ('UNVERIFIED_PROOF', 'TARGET_GAP', 'UNASSIGNED_SERVICE', 'CONNECTOR_DISCONNECTED', 'LOW_REPEAT_REVENUE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE finance_risk_severity AS ENUM ('CRITICAL', 'WARNING', 'INFO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE finance_risk_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS finance_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year varchar(7) NOT NULL,
  target_amount numeric(20,2) NOT NULL CHECK (target_amount > 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_targets_month_idx ON finance_targets (month_year, created_at DESC);

CREATE TABLE IF NOT EXISTS receivable_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type finance_source_type NOT NULL,
  source_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  total_amount numeric(20,2) NOT NULL,
  collected_amount numeric(20,2) NOT NULL DEFAULT 0,
  balance_due numeric(20,2) NOT NULL,
  due_date date NOT NULL,
  aging_days integer NOT NULL DEFAULT 0,
  aging_bucket receivable_aging_bucket NOT NULL,
  collection_status receivable_status NOT NULL DEFAULT 'UNPAID',
  assigned_owner_id uuid,
  linked_invoice_id uuid,
  last_reminder_sent_at timestamptz,
  evidence jsonb,
  activity_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (balance_due >= 0 AND collected_amount >= 0 AND total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS receivable_items_due_idx ON receivable_items (collection_status, due_date);
CREATE INDEX IF NOT EXISTS receivable_items_owner_idx ON receivable_items (assigned_owner_id);

CREATE TABLE IF NOT EXISTS finance_risk_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_type finance_risk_type NOT NULL,
  severity finance_risk_severity NOT NULL,
  title varchar(240) NOT NULL,
  description text NOT NULL DEFAULT '',
  status finance_risk_status NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS finance_risk_actions_queue_idx ON finance_risk_actions (status, severity, created_at DESC);
