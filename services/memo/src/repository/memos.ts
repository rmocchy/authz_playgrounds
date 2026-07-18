import type { Sql } from "./client.ts";
import type {
  CreateMemoInput,
  MemoListScope,
  MemoRecord,
  UpdateMemoInput,
} from "../domain/memo.ts";

export type { MemoListScope };

interface MemoRow {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  is_global: boolean;
  is_secure: boolean;
  created_at: Date;
  updated_at: Date;
}

function requireFirstRow<T>(rows: T[], context: string): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`expected row from ${context}`);
  }
  return row;
}

function mapMemo(row: MemoRow): MemoRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    body: row.body,
    global: row.is_global,
    secure: row.is_secure,
    createdAt: row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at),
    updatedAt: row.updated_at instanceof Date
      ? row.updated_at
      : new Date(row.updated_at),
  };
}

export interface MemoRepository {
  insert(ownerId: string, input: CreateMemoInput): Promise<MemoRecord>;
  findById(id: string): Promise<MemoRecord | null>;
  listForUser(ownerId: string, scope: MemoListScope): Promise<MemoRecord[]>;
  update(id: string, input: UpdateMemoInput): Promise<MemoRecord | null>;
  delete(id: string): Promise<boolean>;
}

export function createMemoRepository(sql: Sql): MemoRepository {
  return {
    async insert(ownerId, input) {
      const id = crypto.randomUUID();
      const now = new Date();
      const rows = await sql<MemoRow[]>`
        INSERT INTO memos (
          id, owner_id, title, body, is_global, is_secure, created_at, updated_at
        )
        VALUES (
          ${id}::uuid,
          ${ownerId}::uuid,
          ${input.title},
          ${input.body},
          ${input.global},
          ${input.secure},
          ${now},
          ${now}
        )
        RETURNING
          id, owner_id, title, body, is_global, is_secure, created_at, updated_at
      `;
      return mapMemo(requireFirstRow(rows, "memos.insert"));
    },

    async findById(id) {
      const rows = await sql<MemoRow[]>`
        SELECT
          id, owner_id, title, body, is_global, is_secure, created_at, updated_at
        FROM memos
        WHERE id = ${id}::uuid
        LIMIT 1
      `;
      return rows[0] ? mapMemo(rows[0]) : null;
    },

    async listForUser(ownerId, scope) {
      if (scope === "mine") {
        const rows = await sql<MemoRow[]>`
          SELECT
            id, owner_id, title, body, is_global, is_secure, created_at, updated_at
          FROM memos
          WHERE owner_id = ${ownerId}::uuid
          ORDER BY created_at DESC, id DESC
        `;
        return rows.map(mapMemo);
      }

      // readable: own memos OR (is_global AND NOT is_secure)
      const rows = await sql<MemoRow[]>`
        SELECT
          id, owner_id, title, body, is_global, is_secure, created_at, updated_at
        FROM memos
        WHERE owner_id = ${ownerId}::uuid
           OR (is_global = true AND is_secure = false)
        ORDER BY created_at DESC, id DESC
      `;
      return rows.map(mapMemo);
    },

    async update(id, input) {
      const existing = await this.findById(id);
      if (!existing) return null;

      const title = input.title !== undefined ? input.title : existing.title;
      const body = input.body !== undefined ? input.body : existing.body;
      const global = input.global !== undefined
        ? input.global
        : existing.global;
      const secure = input.secure !== undefined
        ? input.secure
        : existing.secure;
      const now = new Date();

      const rows = await sql<MemoRow[]>`
        UPDATE memos
        SET
          title = ${title},
          body = ${body},
          is_global = ${global},
          is_secure = ${secure},
          updated_at = ${now}
        WHERE id = ${id}::uuid
        RETURNING
          id, owner_id, title, body, is_global, is_secure, created_at, updated_at
      `;
      return rows[0] ? mapMemo(rows[0]) : null;
    },

    async delete(id) {
      const rows = await sql<Array<{ id: string }>>`
        DELETE FROM memos
        WHERE id = ${id}::uuid
        RETURNING id
      `;
      return rows.length > 0;
    },
  };
}

/** In-memory repo for unit/HTTP tests without Postgres. */
export function createMemoryMemoRepository(
  seed: MemoRecord[] = [],
): MemoRepository {
  const byId = new Map<string, MemoRecord>();
  for (const m of seed) {
    byId.set(m.id, { ...m });
  }

  return {
    insert(ownerId, input) {
      const now = new Date();
      const memo: MemoRecord = {
        id: crypto.randomUUID(),
        ownerId,
        title: input.title,
        body: input.body,
        global: input.global,
        secure: input.secure,
        createdAt: now,
        updatedAt: now,
      };
      byId.set(memo.id, memo);
      return Promise.resolve({ ...memo });
    },

    findById(id) {
      const m = byId.get(id);
      return Promise.resolve(m ? { ...m } : null);
    },

    listForUser(ownerId, scope) {
      const all = [...byId.values()];
      const filtered = all.filter((m) => {
        if (m.ownerId === ownerId) return true;
        if (scope === "readable" && m.global && !m.secure) return true;
        return false;
      });
      filtered.sort((a, b) => {
        const t = b.createdAt.getTime() - a.createdAt.getTime();
        if (t !== 0) return t;
        return b.id.localeCompare(a.id);
      });
      return Promise.resolve(filtered.map((m) => ({ ...m })));
    },

    update(id, input) {
      const existing = byId.get(id);
      if (!existing) return Promise.resolve(null);
      const next: MemoRecord = {
        ...existing,
        title: input.title !== undefined ? input.title : existing.title,
        body: input.body !== undefined ? input.body : existing.body,
        global: input.global !== undefined ? input.global : existing.global,
        secure: input.secure !== undefined ? input.secure : existing.secure,
        updatedAt: new Date(),
      };
      byId.set(id, next);
      return Promise.resolve({ ...next });
    },

    delete(id) {
      return Promise.resolve(byId.delete(id));
    },
  };
}
