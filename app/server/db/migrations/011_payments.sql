CREATE TABLE payment_products (
  id varchar(64) PRIMARY KEY,
  title varchar(100) NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'CNY',
  duration_days integer NOT NULL CHECK (duration_days > 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id varchar(64) NOT NULL REFERENCES payment_products(id),
  merchant_order_no varchar(40) NOT NULL UNIQUE,
  platform_transaction_id varchar(80) UNIQUE,
  amount integer NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending', 'paid', 'failed', 'closed')),
  platform_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE membership_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_order_id uuid NOT NULL UNIQUE REFERENCES payment_orders(id) ON DELETE CASCADE,
  tier varchar(20) NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_orders_user_created_idx ON payment_orders (user_id, created_at DESC);

INSERT INTO payment_products (id, title, amount, currency, duration_days)
VALUES ('heartnest-pro-monthly', '心栖月度会员', 1800, 'CNY', 30)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  amount = EXCLUDED.amount,
  currency = EXCLUDED.currency,
  duration_days = EXCLUDED.duration_days,
  updated_at = now();
