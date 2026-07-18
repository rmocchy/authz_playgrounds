# 受け入れ条件 自己チェック

設計 [`projects/first_commit/design.md`](../projects/first_commit/design.md) **§10** に対応する手元確認リスト。  
実装者 / レビュアが clone 後に埋める想定。

## 起動・構成

- [ ] 手元で `docker compose build` または `docker compose up --build` が成功する（CI では実行しない）
- [ ] `cp .env.example .env` のあと `docker compose up --build` で Auth / Memo / Web / Postgres が起動する
- [ ] ブラウザで http://localhost:5173 が開く
- [ ] サービス名/パスが `auth` であり、`idp` と命名されていない
- [ ] ホストポート目安: Auth **3001** / Memo **3002** / Web **5173** / Postgres **5432**（`*_PORT` で上書き可）

## 認証

- [ ] ユーザーを登録（または `SEED_*`）し、loginId + password でログインできる
- [ ] 未ログインで保護 API（例: メモ一覧）を叩くと **401**
- [ ] password が DB に平文で保存されていない（`password_hash` が bcrypt 形式 `$2…`）

## メモ CRUD と認可

- [ ] ログイン後、メモの作成・一覧・取得・更新・削除ができる
- [ ] メモに `global` / `secure` を設定して保存・再表示できる
- [ ] ユーザー A の **非 global** メモをユーザー B が取得できない（404 想定）
- [ ] ユーザー A の `global=true` かつ `secure=false` を B が **読める**（更新・削除は不可 → 403）
- [ ] `secure=true` は所有者以外が読めない（`global=true` でも同様）

## 技術スタック

- [ ] FE は Vite + TypeScript（`services/web`）
- [ ] BE は Deno + TypeScript（`services/auth`, `services/memo`）
- [ ] TypeSpec 契約（`specs/`）と `pkg/api-client` を FE またはサービスが利用している
- [ ] PostgreSQL を使用している（SafeQL 未配線の場合は各サービス README のフォールバック説明がある）

## テスト・ドキュメント・秘密情報

- [ ] 認可・password の単体テストがある（`authorize_test.ts` / `password_test.ts`）
- [ ] mutation を実行できる: `./tools/mutate.sh`（閾値は初期は緩可）
- [ ] [`docs/local-setup.md`](./local-setup.md) に Docker / ローカル起動手順と主要フローがある
- [ ] Auth（アプリ基盤）と将来 IdP（Google/Okta 相当）の違いがドキュメントにある
- [ ] 秘密鍵・本番相当パスワードが git に含まれない（`.env` は ignore）

## 関連メモ

| トピック | ドキュメント |
|----------|----------------|
| Auth vs IdP | [`docs/auth-vs-idp.md`](./auth-vs-idp.md) |
| secure 将来拡張 | [`docs/secure-flag-future.md`](./secure-flag-future.md) |
| Cookie + proxy | [`docs/cookie-and-vite-proxy.md`](./cookie-and-vite-proxy.md) |
| Mutation | [`docs/mutation-testing.md`](./mutation-testing.md) |
| 起動手順（Docker / ローカル） | [`local-setup.md`](./local-setup.md) |
| 起動入口（最短コマンド） | [`README.md`](../README.md) |
