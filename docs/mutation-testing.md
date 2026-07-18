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

## 単体テストだけ先に回す

```bash
cd services/memo && deno test -A tests/authorize_test.ts
cd services/auth && deno test -A tests/password_test.ts
```
