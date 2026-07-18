---
name: design-doc
description: 実装前に要件・設計を詰め、実装可能な Design Doc を projects/<topic>/ に書く。背景・ゴール/非ゴール・要件・アーキテクチャ案・シーケンス/フロー・代替案・リスク/脅威・Open Questions・受け入れ条件を整理し、曖昧点はユーザーに確認してから確定する。実装コードは書かない。Use when the user runs /design-doc, or asks to write a design doc, 設計書, 要件定義, 実装前の設計, technical spec, or PRD-to-design refinement.
---

# Design Doc Skill

実装**前**に要件を詰め、この repo 向けの Design Doc を書く。コード実装・PR 作成・本番運用設計はしない。

## When invoked

ユーザーが `/design-doc` または設計・要件詰めを依頼したとき。引数や会話に主題があればそれを題材にする。主題が無い・曖昧すぎる場合は、最初に 1〜3 個だけ確認してから進む。

ユーザーが `projects/<name>/draft.md` などプロジェクトパスを指している場合は、そのプロジェクト配下に成果物を置く（下記 Output location）。

## Constraints (this repo)

- **ローカル前提**: 単一マシン / コンテナ / ローカルプロセスで動かす想定。クラウド運用、SLO、ダッシュボード、本番メトリクス、分散トレーシング、アラート設計は書かない（明示依頼がなければセクションごと省略）。
- **学習用 playground**: 認証・認可の理解が目的。外部実在システムへの攻撃手順は書かない。意図的な脆弱パターンを含める場合は、ドキュメント上で明示する。
- **配置境界**: `services/`（サービス固有）と `pkg/`（共有）の依存方向を守る案にする。`pkg` → `services` は不可。
- **ルール**: ルート `AGENTS.md` と `.grok/rules/` に矛盾しない。矛盾しそうなら Open Questions に上げる。
- **実装しない**: Design Doc と必要なら質問のみ。ソースコードや設定の本実装はユーザーが実装フェーズに入ってから。
- **用語**: アプリ側の認証認可基盤は **Auth**（`services/auth`）。**IdP** は Google / Okta 相当の独立プロバイダを指し、別トピックで設計する。初回土台で IdP と名付けない。

## Template

必ず次を読む:

```
<this skill dir>/references/template.md
```

（この `SKILL.md` と同じ親ディレクトリの `references/template.md`。絶対パスで読んでもよい。）

成果物はこのテンプレートの見出し構成に従う。ローカル前提のため **Observability / Metrics / SLI・SLO** 系はテンプレートに含めていない。ユーザーが明示した場合のみ追加する。

## Output location

Design Doc は **`projects/` 配下**に置く。`docs/` には書かない（`docs/` は学習メモ・実装後の解説用）。

1. **ユーザーがプロジェクトを指定している場合（最優先）**  
   例: `projects/first_commit/draft.md` や `projects/first_commit`  
   → **`projects/<name>/design.md`** に書く  
   - 入力の `draft.md` / `prd.md` は上書きしない
2. **主題から新規トピックを切る場合**  
   → `projects/<slug>/design.md`  
   - `<slug>` は英小文字・数字・アンダースコアまたはハイフン（例: `first_commit`, `oidc-auth-code`）
   - ディレクトリが無ければ作成する。必要なら短い `draft.md` は作らず、Design Doc のみでよい
3. ユーザーが明示パスを指定していればそちらを優先（例: `projects/foo/spec.md`）
4. 同名 `design.md` がある場合は上書きせず、差分更新するか別名にするか確認する
5. **禁止（既定）**: `docs/design/` への出力。過去にそこに書いた場合は `projects/` へ移すことを提案する

### プロジェクトディレクトリの慣例

| ファイル | 役割 |
|----------|------|
| `projects/<name>/draft.md` | ラフな要望・受け入れ条件メモ（入力） |
| `projects/<name>/prd.md` | ある場合の PRD（入力） |
| `projects/<name>/design.md` | Design Doc（本 skill の成果物） |

## Workflow

### 1. コンテキスト収集

- ユーザーの依頼文、関連する `projects/**/draft.md` / `prd.md` / `design.md`、`docs/**`、既存 `services/` / `pkg/` を必要最小限読む
- 主題・動機・制約が足りなければ質問する（一度に詰め込みすぎない。ブロッカーになる曖昧点を優先）

### 2. 曖昧点の解消

実装に直結する未決事項は、推測で埋めず Open Questions にするか、ユーザーに確認する。

特に確認しがちな点:

- 対象構成（モノリス寄り / Auth+Product マイクロ / 将来 IdP を分離する前提 など）
- 新規サービスか既存拡張か
- 学習上「正しく動く実装」か「意図的に弱い実装」か（後者なら明示必須）
- ローカルでの起動イメージ（ポート、プロセス数、依存の有無）
- Auth（アプリ基盤）と IdP（外部相当プロバイダ）のどちらを今設計するか

### 3. ドキュメント作成

- テンプレートをベースに Markdown で書く
- 出力パスは上記 Output location（通常 `projects/<name>/design.md`）
- Related 欄に入力の `draft.md` / `prd.md` を書く
- 空セクションは残さない: 不要なら見出しごと削除。未決なら「未決」と理由を一行書くか Open Questions へ
- 図が有効なら mermaid（シーケンス・コンポーネント）を使ってよい
- ファイルパス・パッケージ境界・主要型/エンドポイント名は、後から実装者が迷わない粒度で具体的に
- **受け入れ条件（Acceptance Criteria）** は検証可能な文で書く（「〜できる」「〜を拒否する」）
- **実装アウトライン** は PR 単位のざっくり分割でよい（詳細タスク管理ツールは不要）

### 4. セルフレビュー（実装前チェック）

書き終えたら、自分で次を確認してからユーザーに渡す:

- [ ] 成果物パスが `projects/<name>/design.md`（またはユーザー指定）になっている
- [ ] Goals と Non-goals が切り分けられている
- [ ] 要件が受け入れ条件に落ちている
- [ ] ローカルでどう動かすかが書いてある（メトリクスではなく起動・依存・ポート）
- [ ] `services` / `pkg` の置き場が妥当
- [ ] Auth と IdP の用語が混同されていない
- [ ] 意図的な脆弱性があるなら明示されている
- [ ] Open Questions に「決める人」がユーザー側の事項だけ残っている
- [ ] 実装に着手できる具体性がある（「いい感じに」がない）

### 5. ユーザーへの提示

- 書いたファイルパスを伝える（`projects/.../design.md`）
- Goals / 主要な設計判断 / 残 Open Questions を短く要約する
- Open Questions があれば、この場で決めるか後回しにするか聞く
- 実装フェーズに進む場合は Design Doc を正とする旨を一言添える

## Writing style

- 日本語（ユーザーが英語を指定した場合は英語）
- 断定できることは断定。推測は「想定」「提案」とラベルする
- 長い社内政治や一般論は書かない。この変更に必要なことだけ
- README の再掲をしない。必要な背景はリンクまたは 2〜3 行で

## Anti-patterns

- Design Doc を `docs/design/` に書いてプロジェクト文脈から切り離す
- 本番運用・マルチリージョン・メトリクス基盤の設計に脱線する
- 要件が曖昧なまま実装詳細（クラス設計の過剰な先回り）だけを厚くする
- 代替案ゼロでいきなり一案に決め打ち（少なくとも 1 つは検討して棄却理由を書く）
- 学習用の弱さを「仕様の不備」と誤って書く（意図なら「意図的な弱さ」セクションへ）
- アプリ側 Auth を IdP と命名・記述する（後続の独立 IdP と混同する）
