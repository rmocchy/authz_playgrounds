# Database — init & migrations

Postgres の **DB 作成** と **スキーマ migration** をここに集約する。

| パス | 役割 |
|------|------|
| `init/` | 初回ボリューム時の `CREATE DATABASE`（docker-entrypoint-initdb.d） |
| `migration/auth/` | Auth DB 向け [dbmate](https://github.com/amacneil/dbmate) migration |
| `migration/memo/` | Memo DB 向け dbmate migration |

## ツール

スキーマ適用は **dbmate**（Docker イメージ `amacneil/dbmate`）を使う。  
アプリ（auth / memo）は migration を実行しない。

## コマンド（リポジトリルート）

```bash
# 未適用 migration を適用（compose ネットワーク上の db へ）
npm run db:migrate

# 状態確認
npm run db:status

# 直近 1 本を rollback（学習・検証用）
npm run db:rollback
```

内部では `docker compose run --rm migrate-auth|migrate-memo` を呼ぶ。  
ホストに dbmate バイナリは不要。

## 新規 migration

```bash
# 例: auth に列追加
docker compose run --rm --no-deps --entrypoint dbmate migrate-auth \
  --migrations-dir /migrations new add_users_display_name
# → db/migration/auth/ にファイルが作られる（書き込みが必要なら volume を :ro から外して編集するか、ホストで作成）
```

手書きする場合は `YYYYMMDDHHMMSS_name.sql` とし、次の区切りを入れる:

```sql
-- migrate:up
ALTER TABLE ...;

-- migrate:down
ALTER TABLE ...;
```

## Compose 起動時

`docker compose up` すると `migrate-auth` / `migrate-memo` が `db` healthy のあと one-shot で `up` し、成功後に auth / memo が起動する。

## 注意

- `init/` は **空ボリュームの初回だけ** 走る。DB 名を変えたら `docker compose down -v` でやり直す。
- migration は各 DB の `schema_migrations` で適用済みを管理する（再実行しない）。
- schema dump（`schema.sql`）は `--no-dump-schema` で無効化している（auth/memo 二重管理を避けるため）。
