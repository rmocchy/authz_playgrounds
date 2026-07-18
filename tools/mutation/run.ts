/**
 * Lightweight mutation testing for Deno pure domain modules.
 *
 * Why not StrykerJS? Auth/Memo domain code is Deno + JSR imports; Stryker is
 * Node/Jest-centric. This runner mutates source files in place, re-runs the
 * existing Deno unit tests, and restores files afterward.
 *
 * Targets (critical paths from design §6 / PR 6):
 * - services/memo/src/domain/authorize.ts  (owner / global / secure matrix)
 * - services/auth/src/domain/password.ts   (hash / verify control flow)
 *
 * Score threshold is intentionally low for a playground; see tools/mutate.sh.
 */
import { parseArgs } from "jsr:@std/cli@1/parse-args";

interface Target {
  name: string;
  /** Absolute or repo-relative source path */
  source: string;
  /** Working directory for `deno test` */
  cwd: string;
  /** Args after `deno test` (paths relative to cwd) */
  testArgs: string[];
}

interface Mutant {
  id: string;
  description: string;
  apply: (src: string) => string | null;
}

type Outcome = "killed" | "survived" | "timeout" | "error" | "equivalent";

interface Result {
  target: string;
  mutant: string;
  description: string;
  outcome: Outcome;
  detail?: string;
}

const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");

const TARGETS: Target[] = [
  {
    name: "authorize",
    source: `${ROOT}/services/memo/src/domain/authorize.ts`,
    cwd: `${ROOT}/services/memo`,
    testArgs: ["tests/authorize_test.ts"],
  },
  {
    name: "password",
    source: `${ROOT}/services/auth/src/domain/password.ts`,
    cwd: `${ROOT}/services/auth`,
    // Unit tests only (no HTTP / DB). bcrypt makes these slower than authorize.
    testArgs: ["tests/password_test.ts"],
  },
];

/** Simple, high-signal operators for boolean/authz control flow. */
function buildMutants(source: string, targetName: string): Mutant[] {
  const mutants: Mutant[] = [];

  // Pattern mutations: replace first occurrence of each unique site
  const patterns: Array<{ from: string; to: string; label: string }> = [];

  if (targetName === "authorize") {
    patterns.push(
      {
        from: "actorUserId === memo.ownerId",
        to: "actorUserId !== memo.ownerId",
        label: "invert owner equality",
      },
      {
        from: "if (isOwner) return true;",
        to: "if (isOwner) return false;",
        label: "owner always denied",
      },
      {
        from: 'if (action === "write") return false;',
        to: 'if (action === "write") return true;',
        label: "non-owner write always allowed",
      },
      {
        from: 'if (action === "write") return false;',
        to: 'if (action === "read") return false;',
        label: "write check becomes read check",
      },
      {
        from: "memo.global === true && memo.secure === false",
        to: "memo.global === true || memo.secure === false",
        label: "global&&!secure → global||!secure",
      },
      {
        from: "memo.global === true && memo.secure === false",
        to: "memo.global === false && memo.secure === false",
        label: "require global=false for non-owner read",
      },
      {
        from: "memo.global === true && memo.secure === false",
        to: "memo.global === true && memo.secure === true",
        label: "require secure=true for non-owner read",
      },
      {
        from: "memo.global === true && memo.secure === false",
        to: "true",
        label: "non-owner read always true",
      },
      {
        from: "memo.global === true && memo.secure === false",
        to: "false",
        label: "non-owner read always false",
      },
      {
        from: 'if (action === "write") {',
        to: 'if (action === "read") {',
        label: "decideAccess write branch → read branch",
      },
      {
        from: 'if (canAccess(actorUserId, memo, "read")) {',
        to: 'if (!canAccess(actorUserId, memo, "read")) {',
        label: "invert readable-for-403 check",
      },
      {
        from: 'return "forbidden";',
        to: 'return "allow";',
        label: "forbidden → allow",
      },
      {
        from: 'return "forbidden";',
        to: 'return "not_found";',
        label: "forbidden → not_found",
      },
      {
        from: 'return "not_found";',
        to: 'return "allow";',
        label: "first not_found → allow",
      },
      {
        from: 'return "allow";',
        to: 'return "not_found";',
        label: "allow → not_found",
      },
    );
  }

  if (targetName === "password") {
    patterns.push(
      {
        from: "if (plaintext.length < 1) {",
        to: "if (plaintext.length < 0) {",
        label: "allow empty password hash",
      },
      {
        from: "if (plaintext.length > BCRYPT_MAX_PASSWORD_LENGTH) {",
        to: "if (plaintext.length > BCRYPT_MAX_PASSWORD_LENGTH + 1000) {",
        label: "disable bcrypt length cap",
      },
      {
        from: "if (!passwordHash) return false;",
        to: "if (!passwordHash) return true;",
        label: "empty hash verifies as true",
      },
      {
        from: "if (!passwordHash) return false;",
        to: "if (passwordHash) return false;",
        label: "invert empty-hash guard",
      },
      {
        from: "return await bcrypt.compare(plaintext, passwordHash);",
        to: "return !(await bcrypt.compare(plaintext, passwordHash));",
        label: "invert compare result",
      },
      {
        from: "return await bcrypt.compare(plaintext, passwordHash);",
        to: "return true;",
        label: "compare always true",
      },
      {
        from: "return await bcrypt.compare(plaintext, passwordHash);",
        to: "return false;",
        label: "compare always false",
      },
      {
        from: "} catch {\n    return false;\n  }",
        to: "} catch {\n    return true;\n  }",
        label: "catch returns true on error",
      },
      {
        from: "const BCRYPT_ROUNDS = 10;",
        to: "const BCRYPT_ROUNDS = 4;",
        label: "lower bcrypt cost (may be equivalent for tests)",
      },
    );
  }

  for (const p of patterns) {
    if (!source.includes(p.from)) continue;
    const from = p.from;
    const to = p.to;
    const label = p.label;
    mutants.push({
      id: `${targetName}:${label}`,
      description: label,
      apply: (src) => {
        const idx = src.indexOf(from);
        if (idx < 0) return null;
        return src.slice(0, idx) + to + src.slice(idx + from.length);
      },
    });
  }

  return mutants;
}

async function runTests(
  target: Target,
  timeoutMs: number,
): Promise<{ ok: boolean; detail: string }> {
  const cmd = new Deno.Command("deno", {
    args: ["test", "-A", "--quiet", ...target.testArgs],
    cwd: target.cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const child = cmd.spawn();
  const timer = setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch {
      /* already exited */
    }
  }, timeoutMs);

  try {
    const out = await child.output();
    clearTimeout(timer);
    const stderr = new TextDecoder().decode(out.stderr);
    const stdout = new TextDecoder().decode(out.stdout);
    const detail = (stderr + stdout).trim().slice(0, 400);
    return { ok: out.success, detail };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, detail: String(e) };
  }
}

async function mutateTarget(
  target: Target,
  timeoutMs: number,
): Promise<Result[]> {
  const original = await Deno.readTextFile(target.source);
  const mutants = buildMutants(original, target.name);
  const results: Result[] = [];

  if (mutants.length === 0) {
    console.warn(`  [warn] no mutants generated for ${target.name}`);
    return results;
  }

  console.log(`  mutants: ${mutants.length}`);

  for (const m of mutants) {
    const mutated = m.apply(original);
    if (mutated === null || mutated === original) {
      results.push({
        target: target.name,
        mutant: m.id,
        description: m.description,
        outcome: "equivalent",
        detail: "mutation produced no source change",
      });
      console.log(`  · ${m.description} → equivalent`);
      continue;
    }

    await Deno.writeTextFile(target.source, mutated);
    try {
      const { ok, detail } = await runTests(target, timeoutMs);
      // Tests fail → mutant killed; tests pass → mutant survived
      const outcome: Outcome = ok ? "survived" : "killed";
      results.push({
        target: target.name,
        mutant: m.id,
        description: m.description,
        outcome,
        detail: ok ? undefined : detail.split("\n").slice(0, 2).join(" "),
      });
      console.log(`  · ${m.description} → ${outcome}`);
    } catch (e) {
      results.push({
        target: target.name,
        mutant: m.id,
        description: m.description,
        outcome: "error",
        detail: String(e),
      });
      console.log(`  · ${m.description} → error`);
    } finally {
      await Deno.writeTextFile(target.source, original);
    }
  }

  return results;
}

function score(results: Result[]): {
  total: number;
  killed: number;
  survived: number;
  other: number;
  pct: number;
} {
  const countable = results.filter(
    (r) => r.outcome === "killed" || r.outcome === "survived",
  );
  const killed = countable.filter((r) => r.outcome === "killed").length;
  const survived = countable.filter((r) => r.outcome === "survived").length;
  const other = results.length - countable.length;
  const total = countable.length;
  const pct = total === 0 ? 0 : Math.round((killed / total) * 1000) / 10;
  return { total, killed, survived, other, pct };
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["target", "threshold", "timeout"],
    boolean: ["help"],
    alias: { t: "target", h: "help" },
    default: {
      threshold: "50",
      timeout: "120000",
    },
  });

  if (args.help) {
    console.log(`Usage: deno run -A tools/mutation/run.ts [options]

Options:
  --target, -t   authorize | password | all (default: all)
  --threshold    minimum mutation score percent (default: 50)
  --timeout      per-mutant test timeout ms (default: 120000)
`);
    Deno.exit(0);
  }

  const want = String(args.target ?? "all");
  const threshold = Number(args.threshold);
  const timeoutMs = Number(args.timeout);

  const selected = TARGETS.filter(
    (t) => want === "all" || t.name === want,
  );
  if (selected.length === 0) {
    console.error(`unknown target: ${want}`);
    Deno.exit(2);
  }

  // Baseline: tests must pass before mutation
  console.log("==> Baseline tests (must pass)");
  for (const t of selected) {
    console.log(`  ${t.name}: deno test ${t.testArgs.join(" ")}`);
    const { ok, detail } = await runTests(t, timeoutMs);
    if (!ok) {
      console.error(`baseline failed for ${t.name}:\n${detail}`);
      Deno.exit(1);
    }
    console.log(`  ok`);
  }

  const all: Result[] = [];
  for (const t of selected) {
    console.log(`\n==> Mutating ${t.name} (${t.source.replace(ROOT + "/", "")})`);
    const part = await mutateTarget(t, timeoutMs);
    all.push(...part);
  }

  console.log("\n==> Summary");
  const byTarget = new Map<string, Result[]>();
  for (const r of all) {
    const list = byTarget.get(r.target) ?? [];
    list.push(r);
    byTarget.set(r.target, list);
  }
  for (const [name, list] of byTarget) {
    const s = score(list);
    console.log(
      `  ${name}: ${s.killed}/${s.total} killed (${s.pct}%)` +
        (s.survived ? `, ${s.survived} survived` : "") +
        (s.other ? `, ${s.other} other` : ""),
    );
  }

  const overall = score(all);
  console.log(
    `  overall: ${overall.killed}/${overall.total} killed (${overall.pct}%)`,
  );

  const survived = all.filter((r) => r.outcome === "survived");
  if (survived.length > 0) {
    console.log("\n  Survived mutants (tests did not catch):");
    for (const r of survived) {
      console.log(`    - [${r.target}] ${r.description}`);
    }
  }

  if (overall.total === 0) {
    console.error("error: no countable mutants");
    Deno.exit(1);
  }

  if (overall.pct < threshold) {
    console.error(
      `\nFAIL: mutation score ${overall.pct}% < threshold ${threshold}%`,
    );
    Deno.exit(1);
  }

  console.log(
    `\nPASS: mutation score ${overall.pct}% >= threshold ${threshold}%`,
  );
}

if (import.meta.main) {
  await main();
}
