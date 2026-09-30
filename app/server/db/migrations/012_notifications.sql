CREATE TABLE notification_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform varchar(20) NOT NULL CHECK (platform IN ('wechat', 'app', 'h5')),
  token text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, token)
);

CREATE TABLE notification_authorizations (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL,
  template_id varchar(100) NOT NULL,
  subject text,
  status varchar(20) NOT NULL DEFAULT 'authorized' CHECK (status IN ('authorized', 'revoked', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel, template_id)
);

CREATE TABLE reminder_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL CHECK (channel IN ('wechat', 'app')),
  reminder_time time NOT NULL,
  time_zone varchar(80) NOT NULL,
  quiet_start time NOT NULL,
  quiet_end time NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  target jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  next_delivery_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES reminder_schedules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL,
  payload jsonb NOT NULL,
  target jsonb NOT NULL,
  scheduled_for timestamptz NOT NULL,
  next_attempt_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'dead')),
  last_error varchar(500),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, scheduled_for)
);

CREATE TABLE notification_dead_letters (
  job_id uuid PRIMARY KEY REFERENCES notification_jobs(id) ON DELETE CASCADE,
  error_message varchar(500) NOT NULL,
  failed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notification_jobs_due_idx ON notification_jobs (status, next_attempt_at) WHERE status = 'pending';
CREATE INDEX reminder_schedules_user_idx ON reminder_schedules (user_id, enabled);
