import type { Sql } from "./client.ts";
import type { SessionRecord } from "../domain/session.ts";

interface SessionRow {
  id: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
}

function requireFirstRow<T>(rows: T[], context: string): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`expected row from ${context}`);
  }
  return row;
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

/** Postgres invalid_text_representation (e.g. bad UUID cast). */
function isInvalidInputSyntax(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "22P02") return true;
  // postgres.js may surface message without code in some paths
  return typeof e.message === "string" &&
    /invalid input syntax for type uuid/i.test(e.message);
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
      return mapSession(requireFirstRow(rows, "sessions.insert"));
    },

    async findById(id: string): Promise<SessionRecord | null> {
      // Invalid UUID cookie → no session (401 path). Other DB errors propagate → 500.
      try {
        const rows = await sql<SessionRow[]>`
          SELECT id, user_id, expires_at, created_at
          FROM sessions
          WHERE id = ${id}::uuid
          LIMIT 1
        `;
        return rows[0] ? mapSession(rows[0]) : null;
      } catch (err) {
        if (isInvalidInputSyntax(err)) return null;
        throw err;
      }
    },

    async deleteById(id: string): Promise<void> {
      // Idempotent logout: ignore garbage UUID only; rethrow real DB failures.
      try {
        await sql`
          DELETE FROM sessions WHERE id = ${id}::uuid
        `;
      } catch (err) {
        if (isInvalidInputSyntax(err)) return;
        throw err;
      }
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
    insert(session: SessionRecord) {
      byId.set(session.id, session);
      return Promise.resolve(session);
    },
    findById(id: string) {
      return Promise.resolve(byId.get(id) ?? null);
    },
    deleteById(id: string) {
      byId.delete(id);
      return Promise.resolve();
    },
  };
}
