-- Memo DB schema
-- Applied on Memo service startup (services/memo → runMigrations).
-- owner_id is a logical FK to Auth users (no cross-DB physical FK).

CREATE TABLE IF NOT EXISTS memos (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  is_global BOOLEAN NOT NULL DEFAULT false,
  is_secure BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memos_owner_id_idx ON memos (owner_id);
CREATE INDEX IF NOT EXISTS memos_readable_idx ON memos (is_global, is_secure)
  WHERE is_global = true AND is_secure = false;
