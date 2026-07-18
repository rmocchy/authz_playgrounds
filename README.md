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

1. 環境変数の雛形をコピーする:

```bash
cp .env.example .env
```

2. Compose 設定の確認（任意）:

```bash
docker compose config
```

3. スタック起動:

```bash
docker compose up --build
```

| サービス | コンテナ内ポート（固定） | ホスト公開（既定 / 上書き） | 備考 |
|----------|---------------------------|-----------------------------|------|
| Postgres (`db`) | 5432 | 5432 / `POSTGRES_PORT` | init で DB `auth` / `memo` を作成 |
| Auth | 3001 | 3001 / `AUTH_PORT` | ユーザー・セッション Cookie（`playground_session`） |
| Memo | 3002 | 3002 / `MEMO_PORT` | メモ CRUD + 認可（global / secure） |
| Web | 5173 | 5173 / `WEB_PORT` | Vite FE。proxy: `/api/auth` → Auth、`/api/memo` → Memo |

ブラウザ: **http://localhost:5173**（ログイン / メモ UI）。  
サービス間 URL は compose ネットワーク上の固定内部ポートを使う（例: `http://auth:3001`）。`*_PORT` はホスト側の公開ポートだけを変える。

詳細:

- Auth: [`services/auth/README.md`](services/auth/README.md)
- Memo: [`services/memo/README.md`](services/memo/README.md)
- Web（proxy / Cookie）: [`services/web/README.md`](services/web/README.md)

停止・ボリューム削除:

```bash
docker compose down
# DB を消して init をやり直す場合
docker compose down -v
```

## ディレクトリ

| パス | 役割 |
|------|------|
| `services/` | 各サービス実装（auth / memo / web） |
| `pkg/` | サービス横断の共有（生成クライアント等） |
| `specs/` | TypeSpec 契約 |
| `infra/` | compose 補助（Postgres init 等） |
| `docs/` | 学習メモ・実装後の解説 |
| `projects/` | 企画・設計（Design Doc） |

エージェント向けルール: [`AGENTS.md`](AGENTS.md)

## 秘密情報

- `.env` はコミットしない（`.gitignore` 済み）
- コミットするのは `.env.example` のプレースホルダのみ（`changeme` 等）
