# Backend architecture (auth / memo)

Deno バックエンドは **レイヤ分割** と **ファイルを肥大させない** ことを守る。

## 必須レイヤ（`services/{auth,memo}/src/`）

| ディレクトリ | 役割 |
|--------------|------|
| `handler/` | HTTP 入出力のみ。`Request` 解析 → usecase 呼び出し → `Response` |
| `usecase/` | 1 ユースケースのアプリ処理。repository / domain / clients を使う |
| `domain/` | 純粋な型・ルール（I/O なし） |
| `repository/` | 永続化。1 集約（users / sessions / memos）単位 |

禁止: 旧 `routes/`（複数 handler 同居）、旧 `db/`（名前は `repository/` に統一）。

## ファイルを薄く保つ（検査あり）

`handler/` / `usecase/` は特に薄く保つ。完全に「export 関数ちょうど 1」までは強制しないが、
**ファイル・関数が長くなりすぎない**ことを ESLint で担保する。

- 共有ヘルパーは `http/` や `domain/` へ置く
- barrel（`handler/index.ts` 等）は避け、モジュールを直接 import する
- `domain/` / `repository/` はエンティティ単位の凝集を優先（やや大きめは可）

## 検査

外部 linter: **ESLint** コアの `max-lines` / `max-lines-per-function`（設定はルート `eslint.config.mjs`）。

```bash
# リポジトリルート
npm run lint:size
# 互換エイリアス
npm run lint:architecture
```

| 対象 | max-lines | max-lines-per-function |
|------|-----------|------------------------|
| `services/{auth,memo}/src/**` | 250 | 100 |
| 上記のうち `handler/` · `usecase/` | 120 | 80 |

（blank / comment 行はカウントから除外）
