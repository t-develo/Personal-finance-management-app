# 実装状況比較レポート

> **比較対象A:** `docs/technical-improvement-roadmap.md`（TASK-01〜TASK-13）
> **比較対象B:** ブランチ `claude/opus-project-audit-jtueP` のコミット実装
> **作成日:** 2026-03-06
> **目的:** 計画と実装の差分を明確にし、残作業を把握する

---

## ステータス凡例

| 記号 | 意味 |
|------|------|
| ✅ 完了 | ロードマップで定義した機能がほぼ実装されている（実装手法に差異がある場合あり） |
| ⚠️ 部分実装 | 一部のみ実装済み。残作業あり |
| ❌ 未実装 | 手つかず |

---

## 実装状況サマリー

| Task ID | タイトル | 状況 | opus ブランチでの実装ファイル |
|---------|---------|------|--------------------------|
| TASK-01 | APIバリデーション追加 | ✅ 完了 | `api/src/shared/validators.js`（新規）、`api/src/functions/*.js`（全4ファイル修正）|
| TASK-02 | APIエラーハンドリング強化 | ✅ 完了 | `api/src/shared/errors.js`（新規）、`api/src/functions/*.js`（全4ファイル修正）|
| TASK-03 | フロントエンドエラーハンドリング | ⚠️ 部分実装 | `frontend/src/hooks/useToast.js`（新規）、各タブコンポーネント修正。ErrorBoundary は未作成 |
| TASK-04 | セキュリティ強化 | ⚠️ 部分実装 | `api/src/shared/tableClient.js`（ODataエスケープ追加）。CSP修正・ログイン先変更・authLevel コメントは未 |
| TASK-05 | ユーティリティ関数の集約 | ❌ 未実装 | 変更なし |
| TASK-06 | フォーム送信ローディング状態 | ❌ 未実装 | タブコンポーネントは修正されているが `submitting` 状態・ボタン無効化は含まれない |
| TASK-07 | テストカバレッジ — API | ✅ 完了 | `api/src/__tests__/accounts.test.js`、`creditCards.test.js`、`fixedPayments.test.js`、`monthlyRecords.test.js`、`validators.test.js`、`helpers.js`（全6ファイル新規） |
| TASK-08 | テストカバレッジ — フロントエンド | ⚠️ 部分実装 | `frontend/src/components/ui/__tests__/Modal.test.jsx`（更新のみ）。他のコンポーネント・フックのテストは未 |
| TASK-09 | DevOps / CI改善 | ❌ 未実装 | 変更なし |
| TASK-10 | モニタリング・ロギング | ⚠️ 部分実装 | `errors.js` 内に `context.log` 呼び出しあり。専用 `logger.js`・Application Insights設定は未 |
| TASK-11 | CSSアーキテクチャ整理 | ❌ 未実装 | 変更なし |
| TASK-12 | アクセシビリティ対応 | ⚠️ 部分実装 | `Modal.jsx`・`InputField.jsx`・`SelectField.jsx` は対応済み。`App.jsx` のナビ項目・ハンバーガー・月ナビは未 |
| TASK-13 | パフォーマンス・キャッシング改善 | ❌ 未実装 | 変更なし |

**集計:** ✅ 完了 3件 / ⚠️ 部分実装 5件 / ❌ 未実装 5件

---

## 完了タスクの詳細

### ✅ TASK-01: APIバリデーション追加

**opus ブランチでの実装内容:**

- `api/src/shared/validators.js`（新規作成）に5つのエンティティ単位バリデーション関数を定義
  - `validateAccount(body)` — name（必須・100文字以内）、balance（数値・範囲チェック）
  - `validateCreditCard(body)` — name（必須・100文字以内）、accountId（オプション）
  - `validateFixedPayment(body)` — name・amount・bonusMonths・bonusAmount
  - `validateYearMonth(yearMonth)` — 正規表現 `/^\d{4}-(0[1-9]|1[0-2])$/` で検証
  - `validateMonthlyRecords(body)` — accountBalances・cardPayments の型チェック
- ODataフィルタ: `api/src/shared/tableClient.js` に `escapeODataString(value)` を追加（`'` を `''` にエスケープ）
- `api/src/__tests__/validators.test.js` に詳細なユニットテストを追加（SQLインジェクション攻撃パターンも検証）

**ロードマップとの実装差異:**

| 比較項目 | ロードマップ | opus実装 |
|---------|---------|---------|
| バリデーション関数の粒度 | フィールド単位（`validateString`, `validateAmount`） | エンティティ単位（`validateAccount`, `validateCreditCard`） |
| ODataエスケープ手法 | `@azure/data-tables` の `odata` テンプレートタグ | `escapeODataString()` による文字列エスケープ |
| ファイル名 | `api/src/shared/validate.js` | `api/src/shared/validators.js` |

> **評価:** 目的（不正入力の防止・ODataインジェクション対策）は達成されている。実装手法は異なるが、いずれも有効なアプローチ。

---

### ✅ TASK-02: APIエラーハンドリング強化

**opus ブランチでの実装内容:**

- `api/src/shared/errors.js`（新規作成）に `handleError(error, context)` を集約
  - `SyntaxError` → 400「リクエストの形式が不正です」
  - statusCode 404 → 404「リソースが見つかりません」
  - statusCode 409 → 409「リソースが競合しています」
  - その他 → 500「内部サーバーエラー」
  - `context.log.error()` でログ出力
- 全4ハンドラファイルに try-catch ブロックを追加し、`handleError()` で統一処理
- エラーレスポンスは日本語メッセージで統一（スタックトレース非公開）

**ロードマップとの実装差異:**

| 比較項目 | ロードマップ | opus実装 |
|---------|---------|---------|
| エラー処理のパターン | 各ハンドラ内で直接 catch ブロックに return を書く | `errors.js` に `handleError()` を集約し呼び出す |
| エラー分類 | 500固定（ステータスコードはエラー種別に関わらず統一） | SyntaxError/404/409/500 を自動判別して返す |

> **評価:** ロードマップの要件を満たしつつ、さらに上位のエラー分類まで実装している。良い改善。

---

### ✅ TASK-07: テストカバレッジ — API

**opus ブランチでの実装内容:**

- テストヘルパー `api/src/__tests__/helpers.js`（79行）を新規作成
  - `createAuthenticatedRequest(method, body, params)` — `x-ms-client-principal` ヘッダー付きリクエスト生成
  - `createUnauthenticatedRequest(method, body, params)` — 認証なしリクエスト生成
  - `createMockContext()` — `context.log.error/warn/info` をモック
  - `createMockTableClient()` — Table Storage SDKのモック
  - `createAsyncIterable(items)` — 非同期イテラブルの実装
- 各エンドポイントのテストファイル（合計542行）:
  - `accounts.test.js`（187行）— CRUD・認証・バリデーション・DB障害シナリオ
  - `creditCards.test.js`（121行）— CRUD・バリデーション
  - `fixedPayments.test.js`（119行）— CRUD・金額0の扱い
  - `monthlyRecords.test.js`（115行）— 保存・更新・複数アカウント対応
- `validators.test.js`（138行）— バリデーション関数の詳細テスト

**ロードマップとの実装差異:**

| 比較項目 | ロードマップ | opus実装 |
|---------|---------|---------|
| テストヘルパー | 特定せず（`auth.test.js` のパターンを踏襲） | `helpers.js` として共通ユーティリティを独立ファイル化 |
| テスト粒度 | 各ハンドラの正常系・異常系を個別に列挙 | ヘルパー再利用で簡潔に構成 |

> **評価:** ロードマップの想定以上に充実した実装。テストヘルパーの共通化により保守性も高い。

---

## 部分実装タスクの詳細

### ⚠️ TASK-03: フロントエンドエラーハンドリング

**opus ブランチで実装済みの部分:**

- `frontend/src/hooks/useToast.js`（121行）— Context API + Reducer でトースト通知を実装
  - `showToast(type, message)` API
  - success（3秒・緑）/ error（5秒・赤）/ warning（5秒・オレンジ）の3種
  - `ToastContainer` に `aria-live="polite"` と `role="alert"` を追加（ARIA対応済み）
  - `ToastProvider` でアプリをラップ（`App.jsx` 修正済み）
- 各タブコンポーネント（AccountsTab, CreditCardsTab, FixedPaymentsTab, MonthlyTab）でエラーキャッチ時にトースト通知を使用

**残作業（未実装の部分）:**

| 残作業 | 対象ファイル | 内容 |
|--------|---------|------|
| ① ErrorBoundary の作成 | `frontend/src/components/ErrorBoundary.jsx`（新規） | クラスコンポーネント。`componentDidCatch` でロガー呼び出し、フォールバックUI表示 |
| ② ErrorBoundary の適用 | `frontend/src/main.jsx` | `<ErrorBoundary>` でアプリ全体をラップ |
| ③ handleSubmit のモーダル制御 | AccountsTab, FixedPaymentsTab, CreditCardsTab | エラー時に `setModal(null)` を呼ばないよう制御（現在の状態を確認して修正要否を判断） |

> **注意:** ②は TASK-03 の前提条件（TASK-02）が満たされているため、今すぐ着手可能。

---

### ⚠️ TASK-04: セキュリティ強化

**opus ブランチで実装済みの部分:**

- `api/src/shared/tableClient.js` に `escapeODataString(value)` を追加し、全APIハンドラのODataフィルタに適用（TASK-01と一体で実装済み）

**残作業（未実装の部分）:**

| 残作業 | 対象ファイル | 行番号 | 内容 |
|--------|---------|--------|------|
| ① ログイン先の汎用化 | `frontend/src/api/client.js` | 13 | `/.auth/login/github` → `/.auth/login` に変更（1行の修正） |
| ② CSPのscript-src修正 | `frontend/public/staticwebapp.config.json` | 33 | `script-src 'self' 'unsafe-inline'` → `script-src 'self'` に変更 |
| ③ authLevelのコメント追加 | `api/src/functions/accounts.js` 他3ファイル | 10行目付近 | `authLevel: "anonymous"` の意図を説明するコメントを追加 |
| ④ host.json のタイムアウト設定 | `api/host.json` | — | `functionTimeout`・`maxConcurrentConnections` の設定を追加 |

> **①と②は独立して着手可能。工数Sで完了できる低リスク修正。**

---

### ⚠️ TASK-08: テストカバレッジ — フロントエンド

**opus ブランチで実装済みの部分:**

- `frontend/src/components/ui/__tests__/Modal.test.jsx` を更新
  - ARIA属性の検証（`role="dialog"`、`aria-modal`）
  - キーボード操作（Escapeキー）
  - Focus Trap の動作確認

**残作業（未実装の部分）:**

| 残作業 | 新規ファイル | 内容 |
|--------|---------|------|
| ① vitest.config.js にカバレッジ設定追加 | `frontend/vitest.config.js` | `coverage: { provider: 'v8', reporter: ['text', 'lcov'] }` を追加 |
| ② package.json にスクリプト追加 | `frontend/package.json` | `"test:coverage": "vitest run --coverage"` を追加 |
| ③ AccountsTab テスト | `frontend/src/components/__tests__/AccountsTab.test.jsx`（新規） | 空状態・追加・編集・削除の各シナリオ |
| ④ FixedPaymentsTab テスト | `frontend/src/components/__tests__/FixedPaymentsTab.test.jsx`（新規） | 同様 |
| ⑤ CreditCardsTab テスト | `frontend/src/components/__tests__/CreditCardsTab.test.jsx`（新規） | 同様 |
| ⑥ MonthlyTab テスト | `frontend/src/components/__tests__/MonthlyTab.test.jsx`（新規） | `vi.useFakeTimers()` でデバウンス制御 |
| ⑦ useFinanceData フックテスト | `frontend/src/hooks/__tests__/useFinanceData.test.js`（新規） | `renderHook`・ローカルAPIモック・エラーシナリオ |

> **前提:** TASK-03（ErrorBoundary）が完了してから⑦のエラーシナリオを追加することを推奨。

---

### ⚠️ TASK-10: モニタリング・ロギング

**opus ブランチで実装済みの部分:**

- `api/src/shared/errors.js` 内の `handleError()` で `context.log.error()` を呼び出す（構造化ログの基礎）

**残作業（未実装の部分）:**

| 残作業 | 対象ファイル | 内容 |
|--------|---------|------|
| ① 専用ロガーの作成 | `api/src/shared/logger.js`（新規） | `createLogger(context, userId)` で `{ info, warn, error }` を返す |
| ② 各ハンドラにログ追加 | `api/src/functions/*.js`（全4ファイル） | ハンドラ先頭で `logger.info('route: start', { url, userId })` を追加 |
| ③ Application Insights設定 | `api/host.json` | サンプリング設定のJSONブロックを追加 |
| ④ 環境変数のドキュメント化 | `.env.example`（新規・リポジトリルート） | `APPLICATIONINSIGHTS_CONNECTION_STRING=` を記載（値は空） |

> **①②はTASK-02の try-catch と組み合わせて実施するとスムーズ。③④は独立して着手可能。**

---

### ⚠️ TASK-12: アクセシビリティ対応

**opus ブランチで実装済みの部分:**

- `frontend/src/components/ui/Modal.jsx`
  - `role="dialog"`、`aria-modal="true"`、`aria-labelledby` を追加
  - 閉じるボタンに `aria-label="閉じる"` を追加
  - Focus Trap を実装（Tab/Shift+Tab でモーダル内ループ）
  - Escape キーで閉じる機能を追加
- `frontend/src/components/ui/InputField.jsx`
  - `useId()` で一意IDを生成し、`<label htmlFor>` と `<input id>` を関連付け
- `frontend/src/components/ui/SelectField.jsx`
  - 同様の `useId()` による label-input 関連付け
- `frontend/src/hooks/useToast.js`（TASK-03と兼用）
  - `ToastContainer` に `aria-live="polite"` と `role="alert"` を設定

**残作業（未実装の部分）:**

| 残作業 | 対象ファイル | 行番号 | 内容 |
|--------|---------|--------|------|
| ① ハンバーガーボタン | `frontend/src/App.jsx` | 286 | `aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}` と `aria-expanded={menuOpen}` を追加 |
| ② 月ナビゲーションボタン（App.jsx） | `frontend/src/App.jsx` | 255–263 | `aria-label="前の月"` / `aria-label="次の月"` を追加 |
| ③ 月ナビゲーションボタン（MonthlyTab.jsx） | `frontend/src/components/MonthlyTab.jsx` | 165–176 | 同様の `aria-label` を追加 |
| ④ ナビゲーションの `<nav>` タグ | `frontend/src/App.jsx` | 239 | `aria-label="ナビゲーション"` を追加 |
| ⑤ ナビ項目を div から button へ変更 | `frontend/src/App.jsx` | 241–249 | `<div onClick>` → `<button onClick>` に変更（キーボードフォーカス対応）。button のデフォルトスタイルのリセットも必要 |
| ⑥ カラーコントラスト確認 | `staticwebapp.config.json` 等 | — | `#6b7585` テキストと `#161b24` 背景のコントラスト比をLighthouseで計測（WCAG AA基準 4.5:1） |

> **①〜⑤は独立した修正で、他タスクへの依存なし。特に⑤（div→button）は SEO・アクセシビリティ両方に効果的。**

---

## 未実装タスクの詳細

### ❌ TASK-05: ユーティリティ関数の集約

**現状:** 変更なし。以下の重複定義が残ったまま。

| 関数名 | 重複ファイル |
|--------|---------|
| `fmt(n)` | `Dashboard.jsx:3`、`AccountsTab.jsx:3`、`FixedPaymentsTab.jsx:7`、`MonthlyTab.jsx:3` |
| `parseBonusMonths(str)` | `Dashboard.jsx:7`、`FixedPaymentsTab.jsx:13` |
| `shiftMonth(ym, delta)` | `App.jsx:23`、`MonthlyTab.jsx:12` |
| `formatYearMonth(ym)` | `App.jsx:29`、`MonthlyTab.jsx:7` |

**着手手順:**
1. `frontend/src/utils/finance.js` を新規作成（既存実装をそのままコピー）
2. 各ファイルのローカル定義を削除してインポートに置き換え
3. `npm test` でリグレッションがないことを確認

**前提条件:** なし（今すぐ着手可能）

---

### ❌ TASK-06: フォーム送信ローディング状態

**現状:** AccountsTab.jsx（29行変更）、FixedPaymentsTab.jsx（41行変更）、CreditCardsTab.jsx（27行変更）、Modal.jsx（43行変更）は変更されているが、`submitting` 状態の追加・ボタン無効化は含まれていない。変更内容はエラーハンドリングとアクセシビリティが中心。

**着手手順:**
1. 3タブコンポーネントに `const [submitting, setSubmitting] = useState(false)` を追加
2. `handleSubmit` を `setSubmitting(true) → try/finally → setSubmitting(false)` で囲む
3. `Modal.jsx` に `submitting` prop を追加し、ボタンに `disabled={submitting}` を設定
4. ボタンラベルを `submitting ? '保存中...' : '保存'` に変更
5. `handleDelete` にも同様に `deleting` 状態を追加

**前提条件:** TASK-03（エラーハンドリング）と組み合わせると相乗効果あり（エラー時のボタン再有効化）

---

### ❌ TASK-09: DevOps / CI改善

**現状:** `.github/workflows/ci-cd.yml` および `.github/dependabot.yml` に変更なし。

**着手手順:**
1. `ci-cd.yml` の `build-test-frontend` ジョブに `npm audit --audit-level=high` を追加
2. `test-api` ジョブにも同様に追加
3. フロントエンドの `npm test` を `npm run test:coverage` に変更（TASK-08で `test:coverage` スクリプトを追加後）
4. カバレッジレポートを `actions/upload-artifact@v4` でアップロード
5. `.github/dependabot.yml` を新規作成（frontend/api 週次、GitHub Actions 月次）
6. `.github/pull_request_template.md` を新規作成

**前提条件:** TASK-08（`test:coverage` スクリプト）が完了してからステップ3を実施。ステップ1・2・5・6は今すぐ着手可能。

---

### ❌ TASK-11: CSSアーキテクチャ整理

**現状:** 変更なし。以下の問題が残ったまま。

| 問題 | 対象ファイル |
|------|---------|
| CSS文字列の `<style>` タグ注入 | `App.jsx:282`（`layoutCSS`）、`Dashboard.jsx:159`（`dashboardCSS`）|
| ハードコードカラー値の散在 | 全コンポーネント（`#161b24`, `#1e2530`, `#6b7585`, `#e4e8ef`, `#4f8cff`） |
| CSSカスタムプロパティ（変数）の不在 | `frontend/src/styles/` ディレクトリ自体が存在しない |

> ⚠️ **このタスクは大規模で全コンポーネントに影響する。他のPRがアクティブな期間は避け、単独スプリントで計画すること。**

**前提条件:** なし。ただし他の進行中PRとのコンフリクトリスクが高いため、タイミングを調整する。

---

### ❌ TASK-13: パフォーマンス・キャッシング改善

**現状:** `frontend/src/hooks/useFinanceData.js` の `loadAll()` が毎月変更時に口座・固定支払い・クレジットカードも再フェッチするパターンは変更なし。

**着手手順:**
1. `loadAll` を `loadStatic()`（初回のみ）と `loadMonthly(yearMonth)`（月変更時）に分割
2. `useRef` で月次データのキャッシュを実装（キーは `yearMonth`）
3. 保存成功時にキャッシュを無効化

**前提条件:** TASK-03（フロントエンドエラーハンドリング）の完了を推奨（キャッシュ中エラーのハンドリングが必要）

---

## 実装アプローチの差異まとめ

| Task | ロードマップの設計 | opus実装のアプローチ | 評価 |
|------|---------|---------|------|
| TASK-01 バリデーション | フィールド単位の関数（`validateString`, `validateAmount`）| エンティティ単位の関数（`validateAccount`等）| どちらも有効。エンティティ単位は呼び出しが簡潔だが汎用性は低い |
| TASK-01 ODataエスケープ | `@azure/data-tables` の `odata` テンプレートタグ | `escapeODataString()` による文字列エスケープ | テンプレートタグの方が将来的に安全（ライブラリが型を正確にエスケープ）。現在の文字列エスケープも '→'' で十分な対策 |
| TASK-02 エラー処理 | 各ハンドラ内で直接 `return { status: 500, jsonBody: ... }` | `errors.js` に `handleError()` を集約 | opus 実装の方が保守性高い。エラー分類（404/409/500）も追加されており上位互換 |
| TASK-03 Toast | `Toast.jsx`（コンポーネント）として実装 | `useToast.js`（Context API + Reducer）として実装 | opus 実装の方が設計として堅牢。複数トーストのキュー管理・ARIA対応も含まれている |
| TASK-12 アクセシビリティ | App.jsx のナビ全体を一括で修正 | Modal.jsx・InputField.jsx に集中実装 | opus 実装は高リスク・高影響の Modal を優先した選択。App.jsx の残作業は独立して実施可能 |

---

## 残タスクの推奨着手順序

以下は、現在の実装状態を踏まえた残作業の推奨順序です。

```
今すぐ着手可能（依存なし・工数S）
  TASK-04 残①② — client.js のログイン先変更 + CSP修正
  TASK-12 残①〜⑤ — App.jsx のナビ・ハンバーガー・月ナビのARIA追加
  TASK-05 — ユーティリティ関数集約

TASK-03 残作業完了後
  TASK-06 — フォーム送信ローディング状態（ErrorBoundary と組み合わせると効果的）
  TASK-08 残① ② — vitest カバレッジ設定（TASK-03完了で⑦のエラーシナリオが追加可能に）

TASK-08 残作業完了後
  TASK-09 — DevOps/CI（test:coverage スクリプト追加後に npm run test:coverage に切り替え）

独立して計画
  TASK-10 — モニタリング・ロギング（TASK-02のtry-catchと合わせて実施）
  TASK-11 — CSS整理（単独スプリント）
  TASK-13 — パフォーマンス・キャッシング（TASK-03完了後）
```
