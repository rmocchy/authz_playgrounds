# Authz Playgrounds

認証・認可を手元で実装しながら学ぶ playground（本番システムではない）。

## 初回縦スライス

| コンポーネント | パス / サービス名 | 役割 |
|----------------|-------------------|------|
| **Auth** | `services/auth` / compose `auth` | **アプリ側の認証認可基盤**。ユーザー・セッション・（将来）認可ハブ。ポート **3001** |
| **Memo** | `services/memo` / compose `memo` | メモ CRUD + 認可（global / secure）。ポート **3002** |
| **Web** | `services/web` / compose `web` | Vite FE。ポート **5173** |
| **Postgres** | compose `db` | 単一インスタンス、DB 分割: `auth` / `memo`。ポート **5432** |

設計の詳細: [`projects/first_commit/design.md`](projects/first_commit/design.md)

### Auth と IdP の違い

- **Auth（このリポジトリで実装）**: サービス側の認証認可基盤。id/password ログインとセッション Cookie の正、Memo などが「今誰か」を問い合わせる先。
- **IdP（将来・未実装）**: Google / Okta 相当の **独立した** アイデンティティプロバイダ（OIDC / SAML）。ディレクトリ名も `idp` を空けてある。

混同しないこと: compose サービス名やパスに `idp` は使わない。

## 起動

手順の本体は **[`docs/local-setup.md`](docs/local-setup.md)**（Docker 一括 / ローカル起動の両方）。

最短（Docker Compose）:

```bash
cp .env.example .env
docker compose up --build
```

ブラウザ: **http://localhost:5173**

サービス詳細:

- Auth: [`services/auth/README.md`](services/auth/README.md)
- Memo: [`services/memo/README.md`](services/memo/README.md)
- Web（proxy / Cookie）: [`services/web/README.md`](services/web/README.md)

## テスト

CI:

- Unit / strict lint / **coverage**: [`.github/workflows/test.yml`](.github/workflows/test.yml) — typecheck / test（`--coverage`）/ build + `deno fmt` · `deno lint` · ESLint · Biome · gitleaks。Job Summary + PR コメント + HTML/LCOV artifact
- Mutation: [`.github/workflows/mutation.yml`](.github/workflows/mutation.yml) — StrykerJS（score を Job Summary + PR コメント + artifact）

`docker compose build` はイメージ取得が重いため CI では回さず、手元確認とする（手順: [`docs/local-setup.md`](docs/local-setup.md)）。

```bash
# 記法 + 静的解析 + 秘密情報スキャン（厳しめ一括）
npm run lint:all
npm run lint:secrets # gitleaks のみ（要: brew install gitleaks）
npm run fmt          # 自動整形

# Auth / Memo 単体（各サービスディレクトリ）
cd services/auth && deno task test
cd services/memo && deno task test

# Mutation（StrykerJS。各サービス直下。ランタイムは Deno のまま）
cd services/memo && npm ci && npm run mutate:domain   # authorize・速い
cd services/memo && npm run mutate:http
cd services/auth && npm ci && npm run mutate:domain   # password 含む・遅め
cd services/auth && npm run mutate:http
```

- 手順・閾値・CI: [`docs/mutation-testing.md`](docs/mutation-testing.md)
- 入口: 各サービスの `stryker.*.json` / `npm run mutate:*`


## 学習メモ (`docs/`)

| ドキュメント | 内容 |
|--------------|------|
| [`docs/local-setup.md`](docs/local-setup.md) | **起動手順**（Docker Compose / ローカル） |
| [`docs/auth-vs-idp.md`](docs/auth-vs-idp.md) | Auth（アプリ基盤）と将来 IdP の用語差 |
| [`docs/secure-flag-future.md`](docs/secure-flag-future.md) | `secure` の初回意味とステップアップ拡張 |
| [`docs/cookie-and-vite-proxy.md`](docs/cookie-and-vite-proxy.md) | Cookie + 同一オリジン proxy |
| [`docs/mutation-testing.md`](docs/mutation-testing.md) | mutation の実行方法 |
| [`docs/linting.md`](docs/linting.md) | 記法・lint・secret scan |
| [`docs/acceptance-self-check.md`](docs/acceptance-self-check.md) | 設計 §10 受け入れ条件の自己チェック |

## ディレクトリ

| パス | 役割 |
|------|------|
| `services/` | 各サービス実装（auth / memo / web） |
| `pkg/` | サービス横断の共有（生成クライアント等） |
| `specs/` | TypeSpec 契約 |
| `db/` | Postgres init（`db/init`）とスキーマ migration（`db/migration/{auth,memo}`） |
| `docs/` | 学習メモ・実装後の解説 |
| `projects/` | 企画・設計（Design Doc） |
| `tools/` | `generate.sh`（TypeSpec）、`ci/`（mutation 集計） |

エージェント向けルール: [`AGENTS.md`](AGENTS.md)

## 秘密情報

- `.env` はコミットしない（`.gitignore` 済み）
- コミットするのは `.env.example` のプレースホルダのみ（`changeme` 等）
