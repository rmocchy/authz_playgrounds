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

## ファイルを薄く保つ + レイヤ境界

`handler/` / `usecase/` は特に薄く保つ。

- 共有ヘルパーは `http/` や `domain/` へ置く
- barrel（`handler/index.ts` 等）は避け、モジュールを直接 import する
- import 方向: **handler → usecase → domain / repository**（ESLint `boundaries` で検査）

## 検査（外部 OSS）

```bash
# 一括（記法 + lint）
npm run lint:all
```

| ツール | 内容 |
|--------|------|
| `deno fmt` | 記法 |
| `deno lint` | Deno 推奨 |
| ESLint | サイズ・複雑度・TS 衛生・レイヤ境界 |
| Biome | Web 側（別スタック） |

詳細・閾値: [`docs/linting.md`](../../docs/linting.md)
