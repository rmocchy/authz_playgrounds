/**
 * Architecture lint for Deno backend services (auth / memo).
 *
 * Enforces:
 * 1. Layer layout: handler / usecase / domain / repository under src/
 * 2. No legacy fat directories: routes/, db/
 * 3. Single primary export function per file in handler/ and usecase/
 *    (types / interfaces / type-only re-exports are allowed)
 * 4. No barrel index.ts in handler/ or usecase/
 *
 * Parsing uses the TypeScript compiler API (`typescript` npm package).
 * Filesystem helpers use `@std/fs` / `@std/path`.
 *
 * Usage (from repo root):
 *   npm run lint:architecture
 *   deno task --cwd tools/architecture-lint lint
 *   deno run -A --config tools/architecture-lint/deno.json tools/architecture-lint/run.ts
 */
import { parseArgs } from "@std/cli/parse-args";
import { exists } from "@std/fs/exists";
import { expandGlob } from "@std/fs/expand-glob";
import { fromFileUrl, join, relative } from "@std/path";
import { collectFunctionValueExports } from "./scan.ts";

const ROOT = fromFileUrl(new URL("../..", import.meta.url));

/** Backend services that must follow the layered layout. */
const DEFAULT_SERVICES = ["auth", "memo"] as const;

const REQUIRED_LAYERS = [
  "handler",
  "usecase",
  "domain",
  "repository",
] as const;

/** Directories that must not exist (legacy / wrong name). */
const FORBIDDEN_DIRS = ["routes", "db"] as const;

/** Layers that enforce one primary function export per file. */
const SINGLE_EXPORT_LAYERS = ["handler", "usecase"] as const;

interface Finding {
  service: string;
  rule: string;
  path: string;
  message: string;
}

function serviceSrc(service: string): string {
  return join(ROOT, "services", service, "src");
}

async function listTsFiles(dir: string): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const out: string[] = [];
  for await (
    const entry of expandGlob("**/*.ts", {
      root: dir,
      includeDirs: false,
      exclude: ["**/*.d.ts"],
    })
  ) {
    if (entry.isFile) out.push(entry.path);
  }
  return out.sort();
}

async function checkService(service: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const src = serviceSrc(service);

  if (!(await exists(src))) {
    findings.push({
      service,
      rule: "service-src",
      path: relative(ROOT, src),
      message: `expected src directory missing`,
    });
    return findings;
  }

  for (const layer of REQUIRED_LAYERS) {
    const p = join(src, layer);
    if (!(await exists(p))) {
      findings.push({
        service,
        rule: "required-layer",
        path: relative(ROOT, p),
        message: `required layer directory missing: ${layer}/`,
      });
    }
  }

  for (const bad of FORBIDDEN_DIRS) {
    const p = join(src, bad);
    if (await exists(p)) {
      findings.push({
        service,
        rule: "forbidden-dir",
        path: relative(ROOT, p),
        message:
          `forbidden legacy directory "${bad}/" — use handler/usecase/domain/repository`,
      });
    }
  }

  for (const layer of SINGLE_EXPORT_LAYERS) {
    const layerDir = join(src, layer);
    if (!(await exists(layerDir))) continue;

    const files = await listTsFiles(layerDir);
    for (const file of files) {
      const rel = relative(ROOT, file).replaceAll("\\", "/");
      const base = file.split(/[/\\]/).pop()!;

      if (base === "index.ts" || base === "mod.ts") {
        findings.push({
          service,
          rule: "no-barrel",
          path: rel,
          message:
            `${layer}/ must not use barrel files (index.ts / mod.ts); import the single-responsibility module directly`,
        });
        continue;
      }

      const text = await Deno.readTextFile(file);
      const fns = collectFunctionValueExports(text, base);

      if (fns.length === 0) {
        findings.push({
          service,
          rule: "single-export",
          path: rel,
          message:
            `${layer}/ file must export exactly one primary function (found 0). Types/interfaces alone are not enough — put shared types in domain/ or next to the caller outside this layer.`,
        });
      } else if (fns.length > 1) {
        findings.push({
          service,
          rule: "single-export",
          path: rel,
          message:
            `${layer}/ file must export exactly one primary function (found ${fns.length}: ${fns.join(", ")}). Split into one file per use case / handler.`,
        });
      }
    }
  }

  return findings;
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["service"],
    alias: { s: "service" },
  });

  const services = args.service
    ? [String(args.service)]
    : [...DEFAULT_SERVICES];

  const all: Finding[] = [];
  for (const s of services) {
    all.push(...await checkService(s));
  }

  if (all.length === 0) {
    console.log(`architecture-lint: ok (${services.join(", ")})`);
    Deno.exit(0);
  }

  console.error(`architecture-lint: ${all.length} finding(s)\n`);
  for (const f of all) {
    console.error(`[${f.rule}] ${f.path}`);
    console.error(`  ${f.message}\n`);
  }
  Deno.exit(1);
}

if (import.meta.main) {
  await main();
}
