import type { Sql } from "./client.ts";
import type { UserRecord } from "../domain/user.ts";

interface UserRow {
  id: string;
  login_id: string;
  password_hash: string;
  created_at: Date;
}

function requireFirstRow<T>(rows: T[], context: string): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`expected row from ${context}`);
  }
  return row;
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    loginId: row.login_id,
    passwordHash: row.password_hash,
    createdAt: row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at),
  };
}

export interface UserRepository {
  findByLoginId(loginId: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  insert(user: UserRecord): Promise<UserRecord>;
}

export function createUserRepository(sql: Sql): UserRepository {
  return {
    async findByLoginId(loginId: string): Promise<UserRecord | null> {
      const rows = await sql<UserRow[]>`
        SELECT id, login_id, password_hash, created_at
        FROM users
        WHERE login_id = ${loginId}
        LIMIT 1
      `;
      return rows[0] ? mapUser(rows[0]) : null;
    },

    async findById(id: string): Promise<UserRecord | null> {
      const rows = await sql<UserRow[]>`
        SELECT id, login_id, password_hash, created_at
        FROM users
        WHERE id = ${id}::uuid
        LIMIT 1
      `;
      return rows[0] ? mapUser(rows[0]) : null;
    },

    async insert(user: UserRecord): Promise<UserRecord> {
      const rows = await sql<UserRow[]>`
        INSERT INTO users (id, login_id, password_hash, created_at)
        VALUES (
          ${user.id}::uuid,
          ${user.loginId},
          ${user.passwordHash},
          ${user.createdAt}
        )
        RETURNING id, login_id, password_hash, created_at
      `;
      return mapUser(requireFirstRow(rows, "users.insert"));
    },
  };
}

/** In-memory repo for unit/HTTP tests without Postgres. */
export function createMemoryUserRepository(
  seed: UserRecord[] = [],
): UserRepository {
  const byId = new Map<string, UserRecord>();
  const byLogin = new Map<string, UserRecord>();
  for (const u of seed) {
    byId.set(u.id, u);
    byLogin.set(u.loginId, u);
  }

  return {
    findByLoginId(loginId: string) {
      return Promise.resolve(byLogin.get(loginId) ?? null);
    },
    findById(id: string) {
      return Promise.resolve(byId.get(id) ?? null);
    },
    insert(user: UserRecord) {
      if (byLogin.has(user.loginId)) {
        const err = new Error("duplicate login_id") as Error & {
          code?: string;
        };
        err.code = "23505";
        return Promise.reject(err);
      }
      byId.set(user.id, user);
      byLogin.set(user.loginId, user);
      return Promise.resolve(user);
    },
  };
}
