# Architecture lint

Backend services (`services/auth`, `services/memo`) のレイヤ構成と **1 ファイル 1 責務** を機械的に検査する。

## 依存（外部パッケージ）

| パッケージ | 用途 |
|------------|------|
| [`typescript`](https://www.npmjs.com/package/typescript) | 公式 Compiler API で export を AST 解析 |
| [`@std/fs`](https://jsr.io/@std/fs) / [`@std/path`](https://jsr.io/@std/path) | ファイル走査・パス操作 |
| [`@std/cli`](https://jsr.io/@std/cli) | CLI 引数 |
| [`@std/assert`](https://jsr.io/@std/assert) | 単体テスト |

設定は同ディレクトリの `deno.json`（`nodeModulesDir: "auto"` で npm 解決）。

## 実行

```bash
# リポジトリルート
npm run lint:architecture

# または tools 直下
deno task --cwd tools/architecture-lint lint
deno task --cwd tools/architecture-lint test

# 明示 config
deno run -A --config tools/architecture-lint/deno.json tools/architecture-lint/run.ts
deno run -A --config tools/architecture-lint/deno.json tools/architecture-lint/run.ts --service auth
```

## ルール

| ルール | 内容 |
|--------|------|
| `required-layer` | `src/` 直下に `handler/`, `usecase/`, `domain/`, `repository/` が必須 |
| `forbidden-dir` | 旧構成の `routes/`, `db/` を禁止 |
| `single-export` | `handler/` と `usecase/` の各 `.ts` は **値として export する関数がちょうど 1 つ**（TS AST） |
| `no-barrel` | `handler/` / `usecase/` に `index.ts` / `mod.ts` の barrel を置かない |

### 許可されるもの（`handler` / `usecase`）

- `export interface` / `export type`
- ファイル内の **非 export** ヘルパー
- ちょうど 1 つの `export function` / `export async function` / `export const fn = () => ...`

### 許可されないもの（`handler` / `usecase`）

- 1 ファイルに複数の入口関数
- barrel 経由の value re-export（`export { a, b } from "./x.ts"`）

### レイヤの役割（要約）

| レイヤ | 役割 |
|--------|------|
| `handler/` | HTTP 入出力。usecase を呼ぶ |
| `usecase/` | 1 ユースケースのアプリケーション処理 |
| `domain/` | 純粋な型・ルール（I/O なし） |
| `repository/` | 永続化・クエリ |

`domain/` と `repository/` は単一 export ルールの対象外。

## CI

GitHub Actions の `architecture-lint` job から実行する。
