-- Memo DB schema
-- Applied by dbmate (see docker-compose migrate-memo / npm run db:migrate).
-- owner_id is a logical FK to Auth users (no cross-DB physical FK).

-- migrate:up
CREATE TABLE memos (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  is_global BOOLEAN NOT NULL DEFAULT false,
  is_secure BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX memos_owner_id_idx ON memos (owner_id);
CREATE INDEX memos_readable_idx ON memos (is_global, is_secure)
  WHERE is_global = true AND is_secure = false;

-- migrate:down
DROP TABLE IF EXISTS memos;
