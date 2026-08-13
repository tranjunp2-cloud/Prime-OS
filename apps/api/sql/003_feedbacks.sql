CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE feedback_topic AS ENUM ('UI_UX', 'BUG', 'FEATURE_REQUEST', 'PERFORMANCE', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feedback_sentiment AS ENUM ('VERY_DISSATISFIED', 'DISSATISFIED', 'SATISFIED', 'VERY_SATISFIED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email varchar(320) NOT NULL DEFAULT '',
  topic feedback_topic NOT NULL DEFAULT 'GENERAL',
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  sentiment_rating feedback_sentiment NOT NULL,
  page_url text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedbacks_created_at_idx ON feedbacks (created_at DESC);
CREATE INDEX IF NOT EXISTS feedbacks_topic_idx ON feedbacks (topic);
CREATE INDEX IF NOT EXISTS feedbacks_user_id_idx ON feedbacks (user_id) WHERE user_id IS NOT NULL;
