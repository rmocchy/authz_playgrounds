# Auth と IdP の違い

この playground では用語を意図的に分けている。

## Auth（実装済み · `services/auth`）

- **役割**: アプリ側の認証認可基盤
- **持つもの**: ローカルユーザー（id/password）、セッション Cookie（`playground_session`）、将来の認可ハブ
- **利用側**: Memo が `GET /v1/sessions/me` で「今誰か」を問い合わせる
- **compose 名 / パス**: `auth` / `services/auth`（**`idp` ではない**）

初回ログインは Auth が直接 password を検証する（bcrypt）。

## IdP（将来 · 未実装）

- **役割**: Google / Okta 相当の **独立した** アイデンティティプロバイダ
- **プロトコル想定**: OIDC / SAML など
- **配置想定**: 別サービス（例: `services/idp`）。ディレクトリ名を空けてある
- **Auth との関係**: IdP は「誰であるかの証明」の供給源。アプリ横断のセッション正や認可ハブは **Auth 側に残す**想定

## 混同しやすい点

| 言い方 | 正しい解釈 |
|--------|------------|
| 「IdP にログイン」 | 将来の独立 IdP。今の login API は Auth |
| 「Auth = OIDC Provider」 | 初回は違う。単純な id/password + Cookie |
| サービス名を `idp` にする | 避ける。将来の独立 IdP と衝突する |

詳細な設計判断: [`projects/first_commit/design.md`](../projects/first_commit/design.md) §1 / §13。
