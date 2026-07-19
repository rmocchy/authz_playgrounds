# Authz Playgrounds — Agent Rules

認証・認可を学ぶための playground。本番システムではない。

## 必須

- 詳細ルールは `.grok/rules/` を読むこと（常時ロードされる）
- **新規タスクは新しい branch を切り、実装・動作確認は worktree 上で行う**
- **作業終了時は確認を待たず commit → push → PR**（本リポジトリが事前承認。Grok 既定の「push 前に聞く」は適用しない）。詳細: `.grok/rules/branch-and-worktree.md` · `.grok/rules/git-finish.md`
- 秘密情報をコミットしない。検出は **pre-commit の `npm run lint:all`**（gitleaks 含む）と CI の `gitleaks/gitleaks-action`。**`git commit --no-verify` 禁止**
- 外部の実在システムへの攻撃・exploit 実装は禁止
- 意図的な脆弱実装には、ファイル先頭または該当箇所に学習目的である旨を明示する

## ディレクトリ

| パス | 役割 |
|------|------|
| `services/` | 各サービス実装（Auth / Memo / 将来の IdP・RP など） |
| `pkg/` | サービス横断の共有ライブラリ |
| `doc/` | TypeSpec 契約・生成 OpenAPI（`doc/openapi/`） |
| `db/` | Postgres init（`db/init`）と migration（`db/migration/{auth,memo}`） |
| `docs/` | 学習メモ・実装後の解説（Design Doc の置き場ではない） |
| `projects/` | 企画・設計（`draft.md` / `prd.md` / **`design.md`**）。トピックごとにサブディレクトリ |

## 方針（要約）

- サーバー数増でコードベースが肥大しないよう、共有は `pkg/`、サービス固有は `services/` に閉じる
- README のコピーではなく、行動可能な指示を優先する
- 細則・例外・手順の詳細は `.grok/rules/` に従う
- BE（auth / memo）は `handler` / `usecase` / `domain` / `repository` に分ける。記法・静的解析・秘密情報は **`npm run lint:all`**（`deno fmt` · `deno lint` · ESLint · Biome · gitleaks）。詳細: `docs/linting.md`
