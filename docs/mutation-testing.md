# Mutation testing

認可行列と password 検証など **壊れると危ない分岐** に対し、テストが本当にその分岐を見ているかを軽く確認する。

## なぜ独自 runner か

- Auth / Memo は **Deno**（JSR / npm: 混在）
- StrykerJS は Node + Jest/Vitest 前提で、Deno ドメインへの導入コストが高い
- 初回ゴールは「回ること」と「重要パスにスクリプトがあること」（設計 §6: 閾値は緩可）

実装: [`tools/mutation/run.ts`](../tools/mutation/run.ts) · 入口 [`tools/mutate.sh`](../tools/mutate.sh)

## 対象

| モジュール | テスト | 何を守るか |
|------------|--------|------------|
| `services/memo/src/domain/authorize.ts` | `tests/authorize_test.ts` | owner / global / secure 行列、403 vs 404 |
| `services/auth/src/domain/password.ts` | `tests/password_test.ts` | 空ハッシュ拒否、compare 結果、長さ制限など |

## 実行

リポジトリルートで:

```bash
./tools/mutate.sh                 # authorize + password, threshold 50%
./tools/mutate.sh --target authorize
./tools/mutate.sh --target password
./tools/mutate.sh --threshold 40  # より緩い閾値
MUTATION_THRESHOLD=60 ./tools/mutate.sh
```

前提: `deno` が PATH にあること。

password 側は bcrypt のため **数分かかる**ことがある。authorize のみなら通常数秒〜十数秒。

## スコアの読み方

- **killed**: 変異後にテストが失敗 → テストがその分岐を検知できている
- **survived**: 変異後もテスト成功 → カバレッジの穴、または等価に近い変異
- 既定閾値 **50%**（`MUTATION_THRESHOLD` または `--threshold`）

CI では nightly / main のみ、など段階導入を想定（設計 §9）。

## 限界 / 既知の survived

この runner は **Stryker 相当のフル AST オペレータ一式ではない**。

| 項目 | 実際の挙動 |
|------|------------|
| オペレータ | `tools/mutation/run.ts` に **手で並べた文字列置換**（各サイトの **先頭一致 1 箇所** のみ） |
| 対象 | 上記 2 つの pure domain ファイルのみ（HTTP / DB / ルートは対象外） |
| 復元 | 変異ごとにソースを書き戻す（`finally`）。**Ctrl+C などで途中 kill すると domain ソースが変異したまま残ることがある** → その場合は `git checkout -- services/*/src/domain/` で戻すか、再実行して正常終了させる |

### password でよく survived する変異（現状の unit テストでは落ちない）

| 変異ラベル | なぜ残りやすいか |
|------------|------------------|
| `catch returns true on error` | `bcrypt.compare` が throw する入力を unit で起こしにくい（不正ハッシュは多くの実装で `false` を返す） |
| `lower bcrypt cost` | コスト係数は正しさ（accept/reject）に影響せず、**ほぼ等価変異** |

authorize 側の curated オペレータは現状の表駆動テストで **全 killed** になりやすい。survived が増えたらテストを足すか、等価に近いオペレータを外す。

再現例（目安）: authorize 15/15 killed · password 7/9 killed · overall ≈ 90% 前後（閾値 50% なら PASS）。

## 単体テストだけ先に回す

```bash
cd services/memo && deno test -A tests/authorize_test.ts
cd services/auth && deno test -A tests/password_test.ts
```
