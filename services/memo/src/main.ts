/**
 * Memo service entrypoint — CRUD + authorization matrix.
 * Listens on PORT (default 3002), runs migrations, validates sessions via Auth.
 */
import { loadEnv } from "./env.ts";
import { closeSql, createSql, runMigrations } from "./repository/client.ts";
import { createMemoRepository } from "./repository/memos.ts";
import { createAuthClient } from "./clients/auth.ts";
import { createHandler } from "./app.ts";

async function resolveMigrationsDir(): Promise<string> {
  const moduleDir = new URL(".", import.meta.url).pathname;
  const candidates = [
    `${Deno.cwd()}/migrations`,
    `${moduleDir}../../migrations`.replace(/\/+/g, "/"),
  ];
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

async function main(): Promise<void> {
  const env = loadEnv();
  const sql = createSql(env.databaseUrl);

  const migrationsDir = await resolveMigrationsDir();
  console.log(`running migrations from ${migrationsDir}`);
  await runMigrations(sql, migrationsDir);

  const memos = createMemoRepository(sql);
  const auth = createAuthClient({ baseUrl: env.authBaseUrl });

  const handler = createHandler({ memos, auth });

  const server = Deno.serve({ port: env.port, hostname: "0.0.0.0" }, handler);
  console.log(
    `memo listening on http://0.0.0.0:${env.port} (auth=${env.authBaseUrl})`,
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
