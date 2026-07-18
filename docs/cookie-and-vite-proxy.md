# Cookie と Vite proxy

ブラウザアプリで「ログインしたのに Memo が 401」になりやすい典型原因をまとめる。

## 構成

```
Browser  →  Vite :5173  ──proxy──►  Auth :3001
                 │
                 └──proxy──►  Memo :3002  ──forward Cookie──►  Auth /v1/sessions/me
```

| Browser path | Upstream |
|--------------|----------|
| `/api/auth/*` | Auth の `/*`（プレフィックス除去） |
| `/api/memo/*` | Memo の `/*` |

FE の `pkg/api-client` は相対 base（`/api/auth`, `/api/memo`）を使い、**同一オリジン**で Cookie を扱う。

## Cookie

Auth が発行:

```text
Set-Cookie: playground_session=…; Path=/; HttpOnly; SameSite=Lax
```

- **HttpOnly**: JS から読めない（XSS でトークン窃取しにくい）
- **SameSite=Lax**: 同一サイト navigation では送られる。クロスサイト POST では送られない
- **Secure**: ローカル HTTP では付けない（`COOKIE_SECURE`）。HTTPS 背後では `true` を検討
- **Domain 未指定**: ホストオンリー Cookie。proxy 経由なら Vite のホストに紐づく

## なぜ proxy が必要か

Auth が `localhost:3001`、Web が `localhost:5173` だと **オリジンが違う**。

- 素の CORS + 別オリジン Cookie は `SameSite` / `Secure` / `Access-Control-Allow-Credentials` の沼
- 学習の初回は **同一サイト proxy** で Cookie を単純化する（設計 §8 案 A / D）

## つまずきチェックリスト

- [ ] ブラウザの Network で login 応答に `Set-Cookie` があるか
- [ ] 続く `/api/memo/*` リクエストに `Cookie: playground_session=…` が付いているか
- [ ] Memo ログ / 応答が Auth の `sessions/me` 401 をそのまま返していないか（Auth ダウン・Cookie 未転送）
- [ ] `AUTH_PROXY_TARGET` / `MEMO_PROXY_TARGET` が compose 内外で正しいか  
  - ホスト直接: `http://127.0.0.1:3001`  
  - compose の web: `http://auth:3001`
- [ ] Path が `/` であること（サブパスだけに限定すると proxy 経路で落ちる）

詳細実装メモ: [`services/web/README.md`](../services/web/README.md)。
