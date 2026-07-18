# ローカル起動手順

Auth / Memo / Web / Postgres を手元で動かす手順。  
**Docker Compose（一括）** と **ホスト起動（ローカル）** の 2 系統を記載する。

関連:

- Cookie + Vite proxy: [`cookie-and-vite-proxy.md`](./cookie-and-vite-proxy.md)
- 受け入れ自己チェック: [`acceptance-self-check.md`](./acceptance-self-check.md)
- Auth: [`../services/auth/README.md`](../services/auth/README.md)
- Memo: [`../services/memo/README.md`](../services/memo/README.md)
- Web: [`../services/web/README.md`](../services/web/README.md)

## ポート一覧

| サービス | 役割 | 既定ポート | ホスト公開の上書き |
|----------|------|------------|--------------------|
| Postgres (`db`) | DB `auth` / `memo` | 5432 | `POSTGRES_PORT` |
| Auth | ユーザー・セッション | 3001 | `AUTH_PORT` |
| Memo | メモ CRUD + 認可 | 3002 | `MEMO_PORT` |
| Web | Vite FE | 5173 | `WEB_PORT` |

- Compose 内の **コンテナ listen ポートは固定**（auth 3001 / memo 3002 / web 5173 / db 5432）。
- `*_PORT` は **ホスト側の公開ポート**だけを変える。
- サービス間 URL は compose ネットワーク上の内部ホスト名を使う（例: `http://auth:3001`）。

## 前提

| 起動方法 | 必要もの |
|----------|----------|
| Docker Compose 一括 | Docker + Docker Compose（Colima / Docker Desktop 等） |
| ローカル（Auth / Memo） | [Deno](https://deno.land/) **2.9+**（`deno.lock` は version 5） |
| ローカル（Web） | Node.js **22+** と npm |
| ローカル時の DB | 下記のとおり Compose の `db`、または同等の Postgres |

Auth / Memo の Dockerfile は `denoland/deno:2.9.2` を使用する。これより古い base イメージだと lockfile v5 を読めず `docker compose build` が失敗する。

---

## 1. Docker Compose（推奨・一括起動）

イメージのビルドと 4 サービス起動をまとめて行う。CI の `docker-build` job は `docker compose build` と同等。

### 1.1 環境変数

```bash
# リポジトリルート
cp .env.example .env
```

（任意）起動時にデモユーザーを seed する場合、`.env` で有効化:

```bash
SEED_LOGIN_ID=demo
SEED_PASSWORD=changeme
```

未設定でも Web の **Register** からユーザーを作れる。

ルート `.env` の主な項目:

| 変数 | 意味 |
|------|------|
| `POSTGRES_*` / `POSTGRES_PORT` | DB 資格情報とホスト公開ポート |
| `AUTH_DATABASE_URL` / `MEMO_DATABASE_URL` | compose 内ホスト名 `db` 向け URL |
| `AUTH_PORT` / `MEMO_PORT` / `WEB_PORT` | ホスト公開ポート |
| `SESSION_COOKIE_NAME` | セッション Cookie 名（既定 `playground_session`） |
| `SEED_LOGIN_ID` / `SEED_PASSWORD` | Auth 起動時の任意 seed ユーザー |

### 1.2 ビルドと起動

```bash
# イメージだけ確認（CI の docker-build と同等）
docker compose build

# フォアグラウンド
docker compose up --build

# バックグラウンド
docker compose up --build -d
```

### 1.3 起動確認

```bash
docker compose ps
curl -s http://localhost:3001/health   # {"ok":true}
curl -s http://localhost:3002/health   # {"ok":true}
# ブラウザ
open http://localhost:5173
```

ログ:

```bash
docker compose logs -f auth memo web db
```

### 1.4 停止

```bash
docker compose down
# DB ボリュームごと消して init からやり直す場合
docker compose down -v
```

### 1.5 Compose 内の接続

| From | To | URL / 備考 |
|------|-----|------------|
| Web (Vite proxy) | Auth | `http://auth:3001`（`AUTH_PROXY_TARGET`） |
| Web (Vite proxy) | Memo | `http://memo:3002`（`MEMO_PROXY_TARGET`） |
| Memo | Auth (`/v1/sessions/me`) | `http://auth:3001`（`AUTH_BASE_URL`） |
| Auth / Memo | Postgres | `postgres://…@db:5432/auth` または `/memo` |

ブラウザは **http://localhost:5173** のみを見る。API は同一オリジンの `/api/auth/*`・`/api/memo/*` 経由（proxy が upstream へ転送）。

---

## 2. ローカル起動（ホストでプロセスを起動）

DB は Compose、Auth / Memo / Web はホスト上の Deno / Node で動かす構成。  
デバッグやホットリロードをサービス単位で行いたいときに使う。

### 2.1 前提チェック

```bash
deno --version    # 2.9+
node --version    # 22+
docker compose version
```

### 2.2 Postgres のみ Compose で起動

```bash
# リポジトリルート
cp .env.example .env   # 未作成なら
docker compose up -d db
```

init スクリプトが DB `auth` / `memo` を作成する（初回ボリューム時）。  
ホストからの接続例: `postgres://playground:changeme@localhost:5432/auth`

### 2.3 Auth（:3001）

```bash
cd services/auth
# 必要なら: cp .env.example .env  を編集してから、ツールで読み込むか export する

export PORT=3001
export DATABASE_URL=postgres://playground:changeme@localhost:5432/auth
export SESSION_COOKIE_NAME=playground_session
export SESSION_TTL_SECONDS=604800
export COOKIE_SECURE=false
# 任意 seed
# export SEED_LOGIN_ID=demo
# export SEED_PASSWORD=changeme

deno task start
# 開発中の自動再起動: deno task dev
```

確認: `curl -s http://localhost:3001/health`

### 2.4 Memo（:3002）

別ターミナル:

```bash
cd services/memo

export PORT=3002
export DATABASE_URL=postgres://playground:changeme@localhost:5432/memo
export AUTH_BASE_URL=http://localhost:3001
export SESSION_COOKIE_NAME=playground_session

deno task start
# 開発中: deno task dev
```

確認: `curl -s http://localhost:3002/health`

### 2.5 Web（:5173）

別ターミナル。Auth・Memo が上がっていること。

```bash
cd services/web
npm install
# 既定 proxy は 127.0.0.1:3001 / 3002。上書きする場合:
# export AUTH_PROXY_TARGET=http://127.0.0.1:3001
# export MEMO_PROXY_TARGET=http://127.0.0.1:3002
npm run dev
```

ブラウザ: **http://localhost:5173**

| 用途 | コマンド |
|------|----------|
| 開発サーバ | `npm run dev` |
| typecheck | `npm run check` |
| production bundle | `npm run build` |

### 2.6 ローカル時の接続まとめ

| From | To | 値 |
|------|-----|-----|
| Auth | Postgres | `localhost:5432` / DB `auth` |
| Memo | Postgres | `localhost:5432` / DB `memo` |
| Memo | Auth | `http://localhost:3001` |
| Web proxy | Auth | `http://127.0.0.1:3001` |
| Web proxy | Memo | `http://127.0.0.1:3002` |

サービス固有の雛形: `services/auth/.env.example` · `services/memo/.env.example`

### 2.7 停止

- Auth / Memo / Web: 各ターミナルで `Ctrl+C`
- DB: リポジトリルートで `docker compose stop db` または `docker compose down`

---

## 起動後の主要フロー（共通）

1. http://localhost:5173 を開く
2. **Register** で `loginId` + password を登録（または seed の `demo` / `changeme` でログイン）
3. メモを作成し、`global` / `secure` を切り替えて認可を確認
4. 別ユーザーでログインし、**Readable** で他ユーザーの global（非 secure）メモが見えることを確認

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| `Unsupported lockfile version '5'` | Auth/Memo の Docker base を `denoland/deno:2.9.2` 以上にする（現行 Dockerfile 済み） |
| `docker compose build` 失敗 | 同上 + ホストから `docker pull denoland/deno:2.9.2` が通るか確認 |
| `Docker Compose requires buildx plugin` | 警告のみで classic builder でも動くことが多い。必要なら buildx を導入 |
| イメージ pull が DNS timeout | Colima / Docker 側の DNS・ネットワークを確認 |
| ポート使用中 | `lsof -i :3001 -i :3002 -i :5173 -i :5432` で占有を止めるか、`.env` の `*_PORT` を変更 |
| ログイン後に Memo が 401 | Cookie + proxy 設定を確認 → [`cookie-and-vite-proxy.md`](./cookie-and-vite-proxy.md) |
| DB を初期化したい | `docker compose down -v` のあと、Docker なら `up --build`、ローカルなら `up -d db` から再開 |
| Deno が deps を取れない | ネットワーク確認。`deno task start` は初回に npm/jsr を取得する |

---

## どちらを使うか

| 目的 | 推奨 |
|------|------|
| まず一通り動かす / 受け入れ確認 | **Docker Compose 一括** |
| CI と同等のイメージ検証 | `docker compose build` |
| 単一サービスのコードを頻繁に直す | **ローカル起動**（DB だけ Compose） |
| Cookie / proxy の挙動確認 | どちらでも可。ブラウザは常に :5173 |
