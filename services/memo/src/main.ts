/**
 * Memo service entrypoint — CRUD + authorization matrix.
 * Listens on PORT (default 3002), validates sessions via Auth.
 * Schema migrations are applied by dbmate (compose migrate-memo), not here.
 */
import { loadEnv } from "./env.ts";
import { closeSql, createSql } from "./repository/client.ts";
import { createMemoRepository } from "./repository/memos.ts";
import { createAuthClient } from "./clients/auth.ts";
import { createHandler } from "./app.ts";

async function main(): Promise<void> {
  const env = loadEnv();
  const sql = createSql(env.databaseUrl);

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
