ALTER TABLE data_exports
  ADD COLUMN payload jsonb;

CREATE INDEX data_exports_user_created_idx ON data_exports (user_id, created_at DESC);
