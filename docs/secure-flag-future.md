# `secure` フラグと将来のステップアップ認証

## 初回の意味

メモの `secure` は **at-rest 暗号化ではない**。

| フラグ | 初回の挙動 |
|--------|------------|
| `global=true` | 認証済みの **他ユーザーが読める**（更新・削除は所有者のみ） |
| `secure=true` | **所有者のみ** アクセス（`global=true` でも他者読取不可） |
| `global && secure` | 安全側: 他者読取 **不可**（ステップアップ未実装のため） |

実装の単一の正: `services/memo/src/domain/authorize.ts` の `canAccess` / `decideAccess`。

## 将来の拡張イメージ

ユーザー意図は「後で追加認証を足す」こと（再パスワード / TOTP / WebAuthn 等）。

想定される分岐の増え方:

1. **属性は既にある** — DB / API の `secure` をそのまま使う
2. **セッションに strength** — Auth が「通常ログイン」と「ステップアップ済み」を区別
3. **Memo の判定** — 非所有者 or 所有者でも `secure` メモは、strength が足りないと 401/403
4. **FE** — `secure` メモ操作時に re-auth UI を出す

初回に暗号化や MFA を入れない理由: 土台（owner / global / Cookie セッション）を先に安定させるため。

## 学習ポイント

- フラグだけ先に置くと、認可テストを固定しないと後から壊れやすい
- `global && secure` の「どちらが勝つか」はポリシー決定。本リポジトリは **secure 優先（他者不可）**

関連: [`docs/auth-vs-idp.md`](./auth-vs-idp.md)、設計 §7 / Open Questions #6。
