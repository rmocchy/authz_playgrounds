/**
 * Postgres client via postgres.js.
 *
 * SafeQL: Deno does not have first-class SafeQL/ESLint integration in this
 * playground yet. We use postgres.js with explicit TypeScript row types
 * and parameterized queries. Documented fallback in README.
 *
 * Schema migrations: dbmate under db/migration/auth/ (not this module).
 */
import postgres from "postgres";

export type Sql = ReturnType<typeof postgres>;

export function createSql(databaseUrl: string): Sql {
  return postgres(databaseUrl, {
    // Fail fast in tests / local misconfig
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export async function closeSql(sql: Sql): Promise<void> {
  await sql.end({ timeout: 5 });
}
