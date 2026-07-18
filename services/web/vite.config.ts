import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

/**
 * Vite FE for Authz Playgrounds.
 * Proxies same-origin paths so session cookie (playground_session) works:
 *   /api/auth/* → Auth service (strip /api/auth)
 *   /api/memo/* → Memo service (strip /api/memo)
 */
export default defineConfig(({ mode }) => {
  // loadEnv reads VITE_* and any prefixed vars from .env; process.env also works in Docker
  const env = loadEnv(mode, process.cwd(), "");
  const authTarget =
    env.AUTH_PROXY_TARGET ||
    process.env.AUTH_PROXY_TARGET ||
    "http://127.0.0.1:3001";
  const memoTarget =
    env.MEMO_PROXY_TARGET ||
    process.env.MEMO_PROXY_TARGET ||
    "http://127.0.0.1:3002";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Shared client lives outside services/web
        "@api-client": path.resolve(repoRoot, "pkg/api-client"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: Number(process.env.PORT || 5173),
      strictPort: true,
      // Allow importing ../../pkg/api-client
      fs: {
        allow: [repoRoot],
      },
      proxy: {
        "/api/auth": {
          target: authTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/auth/, "") || "/",
        },
        "/api/memo": {
          target: memoTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/memo/, "") || "/",
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: Number(process.env.PORT || 5173),
      strictPort: true,
      proxy: {
        "/api/auth": {
          target: authTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/auth/, "") || "/",
        },
        "/api/memo": {
          target: memoTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/memo/, "") || "/",
        },
      },
    },
  };
});
