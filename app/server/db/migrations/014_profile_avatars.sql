CREATE TABLE user_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data bytea NOT NULL CHECK (octet_length(data) BETWEEN 1 AND 2097152),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_avatars_user_created_idx ON user_avatars (user_id, created_at DESC);
