CREATE TABLE plan_catalog (
  plan_id varchar(32) NOT NULL,
  capability varchar(64) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  limit_value integer CHECK (limit_value IS NULL OR limit_value >= 0),
  period_kind varchar(20) NOT NULL DEFAULT 'day' CHECK (period_kind IN ('day', 'lifetime')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, capability)
);

CREATE TABLE usage_counters (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability varchar(64) NOT NULL,
  period_start date NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, capability, period_start)
);

CREATE TABLE usage_events (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability varchar(64) NOT NULL,
  reference_id varchar(120) NOT NULL,
  period_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, capability, reference_id)
);

INSERT INTO plan_catalog (plan_id, capability, enabled, limit_value, period_kind) VALUES
  ('free', 'daily_chat', true, 20, 'day'),
  ('free', 'saved_memories', true, 10, 'lifetime'),
  ('free', 'advanced_review', false, 0, 'lifetime'),
  ('pro', 'daily_chat', true, NULL, 'day'),
  ('pro', 'saved_memories', true, NULL, 'lifetime'),
  ('pro', 'advanced_review', true, NULL, 'lifetime')
ON CONFLICT (plan_id, capability) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value,
  period_kind = EXCLUDED.period_kind,
  updated_at = now();
