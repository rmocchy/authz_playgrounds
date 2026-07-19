-- Auth DB: users + sessions
-- Applied by dbmate (see docker-compose migrate-auth / npm run db:migrate).

-- migrate:up
CREATE TABLE users (
  id UUID PRIMARY KEY,
  login_id TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- migrate:down
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
