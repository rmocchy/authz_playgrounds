import type { Sql } from "./client.ts";
import type { SessionRecord } from "../domain/session.ts";

interface SessionRow {
  id: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
}

function mapSession(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at instanceof Date
      ? row.expires_at
      : new Date(row.expires_at),
    createdAt: row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at),
  };
}

export interface SessionRepository {
  insert(session: SessionRecord): Promise<SessionRecord>;
  findById(id: string): Promise<SessionRecord | null>;
  deleteById(id: string): Promise<void>;
}

export function createSessionRepository(sql: Sql): SessionRepository {
  return {
    async insert(session: SessionRecord): Promise<SessionRecord> {
      const rows = await sql<SessionRow[]>`
        INSERT INTO sessions (id, user_id, expires_at, created_at)
        VALUES (
          ${session.id}::uuid,
          ${session.userId}::uuid,
          ${session.expiresAt},
          ${session.createdAt}
        )
        RETURNING id, user_id, expires_at, created_at
      `;
      return mapSession(rows[0]!);
    },

    async findById(id: string): Promise<SessionRecord | null> {
      // Invalid UUID → no row (avoid 500 on garbage cookie)
      const rows = await sql<SessionRow[]>`
        SELECT id, user_id, expires_at, created_at
        FROM sessions
        WHERE id = ${id}::uuid
        LIMIT 1
      `.catch(() => [] as SessionRow[]);
      return rows[0] ? mapSession(rows[0]) : null;
    },

    async deleteById(id: string): Promise<void> {
      await sql`
        DELETE FROM sessions WHERE id = ${id}::uuid
      `.catch(() => {
        /* ignore invalid uuid on logout */
      });
    },
  };
}

/** In-memory session store for tests. */
export function createMemorySessionRepository(
  seed: SessionRecord[] = [],
): SessionRepository {
  const byId = new Map<string, SessionRecord>();
  for (const s of seed) {
    byId.set(s.id, s);
  }

  return {
    async insert(session: SessionRecord) {
      byId.set(session.id, session);
      return session;
    },
    async findById(id: string) {
      return byId.get(id) ?? null;
    },
    async deleteById(id: string) {
      byId.delete(id);
    },
  };
}
