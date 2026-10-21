CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(16) NOT NULL UNIQUE CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE otp_challenges (
  phone VARCHAR(16) PRIMARY KEY,
  code_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consumed_at TIMESTAMPTZ
);
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_name VARCHAR(80) NOT NULL CHECK (length(trim(friend_name)) > 0),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL CHECK (due_date BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  repaid_at TIMESTAMPTZ,
  receipt BYTEA CHECK (octet_length(receipt) <= 2097152)
);
CREATE INDEX loans_user_created_idx ON loans (user_id, created_at DESC, id DESC);
CREATE INDEX loans_user_due_unpaid_idx ON loans (user_id, due_date) WHERE repaid_at IS NULL;
