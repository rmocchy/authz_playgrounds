# Mutation testing

認可行列・password 検証・handler/usecase など **壊れると危ない分岐** に対し、テストがその分岐を本当に見ているかを [StrykerJS](https://stryker-mutator.io/) で測る。

## 構成

| 層 | 技術 | 役割 |
|----|------|------|
| デプロイ / ランタイム | **Deno** | Auth / Memo サービス本体 |
| mutation ハーネス | **StrykerJS**（各サービス配下の npm） | AST 変異・スコア・HTML/JSON |
| テスト | **`deno test`**（Stryker `command` runner） | 既存 unit / HTTP テスト |

自前 runner・`tools/mutate.sh`・`tools/mutation/` は置かない。  
**サービス直下の `stryker.*.json` + `npx stryker run`（npm scripts）だけ**。

| サービス | 設定 | scripts（`package.json`） |
|----------|------|---------------------------|
| [`services/memo`](../services/memo/) | `stryker.domain.json`, `stryker.http.json` | `mutate:domain`, `mutate:http`, `mutate` |
| [`services/auth`](../services/auth/) | 同上 | 同上 |

## 対象

| サービス | script | mutate | テスト |
|----------|--------|--------|--------|
| memo | `mutate:domain` | `src/domain/authorize.ts` | `tests/authorize_test.ts` |
| memo | `mutate:http` | `handler/` · `usecase/` · `http/` | `tests/memos_http_test.ts` |
| auth | `mutate:domain` | password / session / cookies | password + session tests |
| auth | `mutate:http` | `handler/` · `usecase/` · `http/` | `tests/auth_http_test.ts` |

HTTP 設定では `StringLiteral` 変異を除外（エラーメッセージ文言のノイズ抑制）。

レイヤ分割後も Stryker の `mutate` グロブを `handler/**` / `usecase/**` に合わせている（旧 `routes/` は対象外）。

## ローカル実行

```bash
# Memo
cd services/memo
npm ci
npm run mutate:domain   # 速い
npm run mutate:http
# npm run mutate        # domain + http 逐次

# Auth
cd services/auth
npm ci
npm run mutate:domain   # bcrypt のため遅め
npm run mutate:http
```

同等の直接呼び出し:

```bash
cd services/memo
npx stryker run stryker.domain.json
```

### レポート

各サービス配下（gitignore の `reports/`）:

- `reports/mutation/domain/{index.html,mutation.json}`
- `reports/mutation/http/{index.html,mutation.json}`

### スコア

- **killed** / **survived** — Stryker 標準の意味
- break 閾値 **50%**（各 `stryker.*.json` の `thresholds.break`）
- 未達時は Stryker が非 0 終了

## CI

[`.github/workflows/mutation.yml`](../.github/workflows/mutation.yml)

- トリガー: PR / `main` / `workflow_dispatch`
- matrix: `{memo,auth} × {domain,http}` → `npm ci` → `npm run mutate:<target>`
- スコア: `tools/ci/mutation-report.sh` が Job Summary に書き、`mutation-summary` が sticky PR コメントに集約
- artifact: Stryker 出力 `reports/mutation/{domain,http}/`（HTML / JSON + `*-metrics.json`）
- 合否は Stryker `thresholds.break`（集計は表示用。ゲートは各ジョブの Stryker）
- unit CI（`test.yml`）とは分離。unit 側は coverage を同様に Job Summary + sticky PR コメント

## 限界

| 項目 | 内容 |
|------|------|
| coverage analysis | `command` runner のため `off` |
| 速度 | HTTP・password は重い → CI ジョブ分割 |
| 対象外 | Postgres 実装、FE、Dockerfile / env のみ |

survived が増えたらテスト追加が第一選択。

## トラブルシュート

- `npm ci` 後に `npx stryker --version` で入っているか確認
- baseline 失敗時は先に `deno task test`
- `Could not find a matching package for 'npm:…' in the node_modules directory` — 各サービスの `deno.json` に `"nodeModulesDir": "auto"` があること（mutation 用 `package.json` があると Deno が local `node_modules` を要求するため）。無ければ追加するか `deno install` を実行
- CI のレポート: PR コメント（`<!-- ci-mutation-scores -->`）+ Job Summary + artifact の HTML / `mutation.json`
