CREATE TABLE favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type varchar(20) NOT NULL CHECK (target_type IN ('message')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX favorites_user_created_idx ON favorites (user_id, created_at DESC);
CREATE INDEX mood_records_user_mood_recorded_idx ON mood_records (user_id, mood_id, recorded_at DESC);
