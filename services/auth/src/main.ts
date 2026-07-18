/**
 * Auth service entrypoint — app authz platform (NOT an IdP).
 * Listens on PORT (default 3001), runs migrations, optional seed user.
 */
import { loadEnv } from "./env.ts";
import { closeSql, createSql, runMigrations } from "./repository/client.ts";
import { createUserRepository } from "./repository/users.ts";
import { createSessionRepository } from "./repository/sessions.ts";
import { createHandler } from "./app.ts";
import { hashPassword } from "./domain/password.ts";

async function resolveMigrationsDir(): Promise<string> {
  // Prefer CWD/migrations (Docker WORKDIR /app), then relative to this module.
  const moduleDir = new URL(".", import.meta.url).pathname;
  const candidates = [
    `${Deno.cwd()}/migrations`,
    // src/ → service root migrations/
    `${moduleDir}../../migrations`.replace(/\/+/g, "/"),
  ];
  // Normalize .. segments for file URL path
  const normalized = candidates.map((p) => {
    try {
      return Deno.realPathSync(p);
    } catch {
      return p;
    }
  });
  for (const dir of [candidates[0]!, ...normalized, candidates[1]!]) {
    try {
      const st = await Deno.stat(dir);
      if (st.isDirectory) return dir;
    } catch {
      // try next
    }
  }
  throw new Error(
    `migrations directory not found (tried: ${candidates.join(", ")})`,
  );
}

async function maybeSeed(
  users: ReturnType<typeof createUserRepository>,
  loginId: string,
  password: string,
): Promise<void> {
  const existing = await users.findByLoginId(loginId);
  if (existing) {
    console.log(`seed user already exists: ${loginId}`);
    return;
  }
  const passwordHash = await hashPassword(password);
  await users.insert({
    id: crypto.randomUUID(),
    loginId,
    passwordHash,
    createdAt: new Date(),
  });
  console.log(`seeded user: ${loginId}`);
}

async function main(): Promise<void> {
  const env = loadEnv();
  const sql = createSql(env.databaseUrl);

  const migrationsDir = await resolveMigrationsDir();
  console.log(`running migrations from ${migrationsDir}`);
  await runMigrations(sql, migrationsDir);

  const users = createUserRepository(sql);
  const sessions = createSessionRepository(sql);

  if (env.seedLoginId && env.seedPassword) {
    await maybeSeed(users, env.seedLoginId, env.seedPassword);
  }

  const handler = createHandler({
    users,
    sessions,
    sessionCookieName: env.sessionCookieName,
    sessionTtlMs: env.sessionTtlMs,
    cookieSecure: env.cookieSecure,
  });

  const server = Deno.serve({ port: env.port, hostname: "0.0.0.0" }, handler);
  console.log(
    `auth listening on http://0.0.0.0:${env.port} (cookie=${env.sessionCookieName})`,
  );

  const shutdown = async () => {
    console.log("shutting down...");
    await server.shutdown();
    await closeSql(sql);
  };
  Deno.addSignalListener("SIGINT", () => {
    void shutdown().then(() => Deno.exit(0));
  });
  try {
    Deno.addSignalListener("SIGTERM", () => {
      void shutdown().then(() => Deno.exit(0));
    });
  } catch {
    // SIGTERM may be unavailable on some platforms
  }

  await server.finished;
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    Deno.exit(1);
  });
}
