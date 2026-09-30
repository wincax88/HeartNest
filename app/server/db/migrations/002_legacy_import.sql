CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_companion_id varchar(32) NOT NULL DEFAULT 'mika',
  notifications_enabled boolean NOT NULL DEFAULT true,
  reply_style varchar(32) NOT NULL DEFAULT 'gentle',
  memory_prompts_enabled boolean NOT NULL DEFAULT true,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier varchar(20) NOT NULL DEFAULT 'free',
  title varchar(80) NOT NULL DEFAULT '心栖体验',
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  source varchar(32) NOT NULL DEFAULT 'legacy_import',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guest_claims
  ADD COLUMN source_version integer NOT NULL DEFAULT 1;
