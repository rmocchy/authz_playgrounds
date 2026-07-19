/**
 * Postgres client via postgres.js.
 *
 * SafeQL: Deno does not have first-class SafeQL/ESLint integration in this
 * playground yet. We use postgres.js with explicit TypeScript row types
 * and parameterized queries. Documented fallback in README.
 */
import postgres from "postgres";

export type Sql = ReturnType<typeof postgres>;

export function createSql(databaseUrl: string): Sql {
  return postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

/**
 * Apply SQL migration files in order (idempotent via IF NOT EXISTS).
 * Source of truth: `db/migration/memo/` (Docker image copies them to /app/migrations).
 */
export async function runMigrations(
  sql: Sql,
  migrationsDir: string,
): Promise<void> {
  const entries: string[] = [];
  for await (const entry of Deno.readDir(migrationsDir)) {
    if (entry.isFile && entry.name.endsWith(".sql")) {
      entries.push(entry.name);
    }
  }
  entries.sort();

  for (const name of entries) {
    const path = `${migrationsDir}/${name}`;
    const body = await Deno.readTextFile(path);
    await sql.unsafe(body);
  }
}

export async function closeSql(sql: Sql): Promise<void> {
  await sql.end({ timeout: 5 });
}
