# Linting & formatting

外部 OSS のみ。自前 AST ルールは持たない。

## 構成

| 対象 | ツール | 役割 |
|------|--------|------|
| Auth / Memo / api-client | **`deno fmt`** | 記法（インデント・改行・クォート） |
| Auth / Memo / api-client | **`deno lint`** | Deno 推奨ルール（`require-await` 等） |
| Auth / Memo `src/` | **ESLint** | サイズ・複雑度・記法衛生・レイヤ境界 |
| Web | **Biome** | フォーマット + 厳しめ lint（a11y 含む） |
| 全般 | **EditorConfig** | IDE 間の indent / EOL |
| 秘密情報 | **gitleaks**（CLI / GitHub Action） | 鍵・トークン・dotenv の混入 |

設定:

- `eslint.config.mjs` — BE
- `biome.json` — Web
- 各 `services/*/deno.json` · `pkg/api-client/deno.json` — fmt/lint オプション
- `.editorconfig`
- `.gitleaks.toml` · `npm run lint:secrets`（gitleaks CLI）

## 実行（リポジトリルート）

```bash
npm install          # ESLint / Biome
npm run lint:all     # fmt check + deno lint + ESLint + Biome
npm run fmt          # 自動整形（deno + biome write）
npm run lint         # lint のみ（fmt check なし）
```

| script | 内容 |
|--------|------|
| `fmt:deno` / `fmt:deno:check` | BE 整形 |
| `fmt:web` / `fmt:web:check` | Web 整形 |
| `lint:deno` | `deno lint` |
| `lint:eslint` | サイズ・複雑度・boundaries 等 |
| `lint:web` | `biome check` |
| `lint:secrets` | gitleaks（`.gitleaks.toml`） |
| `lint:all` | CI 相当の一括（secrets 含む） |

## Secret scan

```bash
# 要: gitleaks on PATH
brew install gitleaks   # macOS
npm run lint:secrets
```

検査内容（`.gitleaks.toml`）:

- デフォルトルール + カスタム:
  - dotenv の `password=` / `token=` / `api_key=` 等
  - `postgres://user:password@...` 形式
  - Bearer / Authorization っぽい値
- CI: [`gitleaks/gitleaks-action`](https://github.com/gitleaks/gitleaks-action)（ローカルは CLI）
- `.env` 本体は `.gitignore` で除外（コミットしない）

allowlist（`.gitleaks.toml`）:

- プレースホルダ `changeme` / `playground:changeme@`（ローカル用）
- 意図的な public bcrypt fixture（`password.ts` の dummy hash）
- docs / README / `.env.example` / compose の例示

## ESLint（厳しめ）の要点

| ルール | 目安 |
|--------|------|
| `max-lines` | 全体 250 / handler·usecase 100 |
| `max-lines-per-function` | 全体 80 / handler·usecase 50 / repository 100 |
| `complexity` | 12（handler·usecase は 8、router/main は 20） |
| `max-depth` / `max-params` | 4 |
| `eqeqeq` · `prefer-const` · `no-var` · `prefer-template` | 記法衛生 |
| `no-console` | `warn`/`error` のみ可（main/app は例外） |
| `@typescript-eslint/no-explicit-any` · `no-non-null-assertion` | 厳格 TS |
| `boundaries/dependencies` | handler→usecase→domain/repository の方向 |

`curly` は **off**（`deno fmt` が単行 if のブレースを外すため）。

## Biome（Web）

- recommended + cognitive complexity ≤ 15
- a11y / security / performance recommended
- `noExplicitAny` · `noNonNullAssertion` · `noConsole`（warn/error 以外禁止）

## CI

[`.github/workflows/test.yml`](../.github/workflows/test.yml) の **Lint** job が `fmt:deno:check` · `lint:deno` · `lint:eslint` · `lint:web` · gitleaks-action を実行する。
