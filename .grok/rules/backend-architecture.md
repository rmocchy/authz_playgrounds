# Backend architecture (auth / memo)

Deno バックエンドは **レイヤ分割** と **handler/usecase の 1 ファイル 1 責務** を守る。

## 必須レイヤ（`services/{auth,memo}/src/`）

| ディレクトリ | 役割 |
|--------------|------|
| `handler/` | HTTP 入出力のみ。`Request` 解析 → usecase 呼び出し → `Response` |
| `usecase/` | 1 ユースケースのアプリ処理。repository / domain / clients を使う |
| `domain/` | 純粋な型・ルール（I/O なし） |
| `repository/` | 永続化。1 集約（users / sessions / memos）単位 |

禁止: 旧 `routes/`（複数 handler 同居）、旧 `db/`（名前は `repository/` に統一）。

## 1 ファイル 1 責務（強制）

`handler/` と `usecase/` では、**値として export する関数はちょうど 1 つ**。

- OK: `export interface Deps` + `export async function handleX` のみ
- OK: ファイル内の非 export ヘルパー
- NG: 1 ファイルに `handleRegister` と `handleLogin`
- NG: `handler/index.ts` などの barrel

共有ヘルパー（資格情報パース、JSON 読み取りなど）は `http/` や `domain/` へ置く。handler/usecase に詰め込まない。

`domain/` / `repository/` はエンティティ単位の凝集を優先し、複数の純粋関数や repo メソッドの同居を許可する。

## 検査

```bash
# リポジトリルート（TypeScript AST + @std/*）
npm run lint:architecture
# または
deno run -A --config tools/architecture-lint/deno.json tools/architecture-lint/run.ts
```

詳細: `tools/architecture-lint/README.md`
