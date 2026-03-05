# 技術改善ロードマップ

> **対象プロジェクト:** Personal Finance Management App（個人家計管理アプリ）
> **作成者:** CTO
> **作成日:** 2026-03-05
> **ステータス:** レビュー済み・実装待ち

---

## はじめに

このドキュメントは、本プロジェクトにおける技術的な課題と改善計画をまとめたものです。
複数のSEが独立して作業できるよう、各Issueに「背景・対象ファイル・手順・検証方法」を記載しています。

### 本ドキュメントの読み方

- **担当者を事前に決める必要はありません。** 各Issueは独立して着手できます。
- **作業前に必ず対象ファイルを読んでください。** ファイルパスと行番号を記載しています。
- **不明点はIssueにコメントを残してください。**
- 工数見積もりは目安です（S: 半日以内、M: 1〜2日、L: 3日以上）。

---

## 作業優先順位マップ

| # | タイトル | 優先度 | 工数 | Phase | 並行実施 |
|---|---------|--------|------|-------|---------|
| 1 | APIバリデーション追加 | 🔴 高 | M | 1 | 他と並行可 |
| 2 | エラーハンドリング強化 | 🔴 高 | M | 1 | 他と並行可 |
| 3 | フォーム二重送信防止 | 🔴 高 | S | 1 | 他と並行可 |
| 4 | ユーティリティ関数集約 | 🟡 中 | S | 2 | Phase 1と並行可 |
| 5 | テストカバレッジ強化 | 🟡 中 | L | 2 | Phase 1と並行可 |
| 6 | DevOps改善 | 🟡 中 | M | 2 | Phase 1と並行可 |
| 7 | モニタリング・ロギング導入 | 🟡 中 | M | 2 | Phase 1と並行可 |
| 8 | アクセシビリティ対応 | 🟡 中 | M | 2 | Phase 1と並行可 |
| 9 | CSSアーキテクチャ整理 | 🟢 低 | L | 3 | いつでも可 |
| 10 | パフォーマンス・キャッシング改善 | 🟢 低 | M | 3 | いつでも可 |
| 11 | TypeScript移行 | 🔵 大規模 | XL | 4 | 独立計画で実施 |

### 推奨作業順序

```
Phase 1（最優先・セキュリティ・安定性）
  Issue #1, #2, #3 ← これらは互いに独立しており、3名が同時着手可能

Phase 2（品質・保守性、Phase 1と並行可）
  Issue #4, #5, #6, #7, #8 ← 互いに独立。最大5名が同時着手可能

Phase 3（改善、いつでも可）
  Issue #9, #10 ← 独立。但し #9 は #4（CSS変数）の完了後が望ましい

Phase 4（大規模移行、別途計画）
  Issue #11 ← 上記すべてのPhaseと独立して計画・実施
```

---

## Phase 1: 高優先度タスク

### Issue #1: APIエンドポイントへの入力バリデーション追加

**優先度:** 🔴 高　**工数:** M（1〜2日）

#### 問題の概要

すべてのAPIエンドポイントで、リクエストボディの入力値が検証されていません。
悪意のあるデータ（空文字、超長文字列、数値以外の金額など）がそのままAzure Table Storageに保存されます。
また、Azure Table StorageのODataフィルタクエリでユーザーIDを直接埋め込んでいるため、OData Injection のリスクがあります。

**影響範囲:**

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `api/src/functions/accounts.js` | 44–56 | POST時にname/balanceの検証なし |
| `api/src/functions/accounts.js` | 80–93 | PUT時にname/balanceの検証なし |
| `api/src/functions/accounts.js` | 18–22 | ODataフィルタにuserIdを直接埋め込み |
| `api/src/functions/fixedPayments.js` | 全体 | 同様の問題（name, amount, accountId, bonusMonths） |
| `api/src/functions/creditCards.js` | 全体 | 同様の問題（name, accountId） |
| `api/src/functions/monthlyRecords.js` | 全体 | 同様の問題（yearMonth形式の検証なし） |

#### 解決アプローチ

**Step 1: 共通バリデーションヘルパーの作成**

`api/src/shared/validation.js` を新規作成する。

```javascript
// api/src/shared/validation.js

/**
 * バリデーションエラーを返す。問題なければnullを返す。
 */
function validateRequired(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return `${fieldName} は必須です`;
  }
  return null;
}

function validateString(value, fieldName, { maxLength = 200 } = {}) {
  const err = validateRequired(value, fieldName);
  if (err) return err;
  if (typeof value !== 'string') return `${fieldName} は文字列である必要があります`;
  if (value.trim().length === 0) return `${fieldName} は空白のみにできません`;
  if (value.length > maxLength) return `${fieldName} は${maxLength}文字以内にしてください`;
  return null;
}

function validateNumber(value, fieldName, { min = null, max = null } = {}) {
  const num = Number(value);
  if (isNaN(num)) return `${fieldName} は数値である必要があります`;
  if (min !== null && num < min) return `${fieldName} は${min}以上にしてください`;
  if (max !== null && num > max) return `${fieldName} は${max}以下にしてください`;
  return null;
}

function validateYearMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(value)) return 'yearMonth は YYYY-MM 形式にしてください';
  const [year, month] = value.split('-').map(Number);
  if (month < 1 || month > 12) return '月は1〜12の範囲にしてください';
  if (year < 2000 || year > 2100) return '年は2000〜2100の範囲にしてください';
  return null;
}

module.exports = { validateRequired, validateString, validateNumber, validateYearMonth };
```

**Step 2: accounts.js にバリデーションを追加**

POSTハンドラ（accounts-create）に追加：

```javascript
const { validateString, validateNumber } = require('../shared/validation');

// POST ハンドラ内
const body = await request.json();
const nameErr = validateString(body.name, '口座名');
if (nameErr) return { status: 400, jsonBody: { error: nameErr } };
const balErr = validateNumber(body.balance ?? 0, '残高', { min: -999999999, max: 999999999 });
if (balErr) return { status: 400, jsonBody: { error: balErr } };
```

**Step 3: 同様の修正を全APIファイルに適用**

- `fixedPayments.js`: name（文字列）、amount（数値 >= 0）、bonusMonths（カンマ区切り1〜12の数値）、bonusAmount（数値）
- `creditCards.js`: name（文字列）
- `monthlyRecords.js`: yearMonthパスパラメータの形式チェック（`validateYearMonth`）

**Step 4: OData Injection対策**

現在のフィルタクエリ（`accounts.js:20`）は以下のように書き換える：

```javascript
// 変更前（リスクあり）
filter: `PartitionKey eq '${user.userId}'`

// 変更後（odata.escapeStringValue でエスケープ）
// @azure/data-tables の odata タグドテンプレートを使用
import { odata } from '@azure/data-tables';
filter: odata`PartitionKey eq ${user.userId}`
```

`@azure/data-tables` の `odata` テンプレートタグは値を自動エスケープします。全4ファイルのすべてのフィルタクエリに適用してください。

#### 検証方法

1. `curl -X POST /api/accounts -d '{"name":"","balance":"abc"}'` で400エラーが返ること
2. `curl -X POST /api/accounts -d '{"name":"テスト口座","balance":1000}'` で201が返ること
3. 既存のAPIテスト（`api/src/__tests__/`）が引き続きパスすること
4. 新たにバリデーションのユニットテストを `api/src/__tests__/validation.test.js` として追加する

---

### Issue #2: エラーハンドリングの強化

**優先度:** 🔴 高　**工数:** M（1〜2日）

#### 問題の概要

フロントエンドとバックエンドの両方でエラーハンドリングが不十分です。

- **フロントエンド:** API呼び出し失敗時に `console.error` のみで、ユーザーへの通知がない
- **バックエンド:** APIハンドラにtry-catchがなく、未処理例外が発生すると関数全体がクラッシュし500エラーになる
- **React:** エラーバウンダリがなく、コンポーネントの例外がアプリ全体を停止させる

**影響範囲:**

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `frontend/src/hooks/useFinanceData.js` | 27 | `console.error`のみ。ユーザーへ通知なし |
| `frontend/src/components/MonthlyTab.jsx` | 128 | `saveMonthly()`を呼ぶ際にtry-catchなし |
| `api/src/functions/accounts.js` | 全体 | try-catchなし |
| `api/src/functions/fixedPayments.js` | 全体 | try-catchなし |
| `api/src/functions/creditCards.js` | 全体 | try-catchなし |
| `api/src/functions/monthlyRecords.js` | 全体 | try-catchなし |

#### 解決アプローチ

**Step 1: フロントエンドにトースト通知コンポーネントを追加**

`frontend/src/components/ui/Toast.jsx` を新規作成する。

```jsx
// frontend/src/components/ui/Toast.jsx
import React, { useEffect } from 'react';

export default function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'error' ? '#7f1d1d' : '#14532d';
  const border = type === 'error' ? '#dc2626' : '#16a34a';

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 8, padding: '12px 20px', color: '#fff',
      fontSize: 14, maxWidth: 360, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    }}>
      {message}
      <button onClick={onClose} style={{
        marginLeft: 12, background: 'none', border: 'none',
        color: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1,
      }}>×</button>
    </div>
  );
}
```

**Step 2: App.jsx にトースト状態を追加**

`frontend/src/App.jsx` でトースト状態を管理し、全コンポーネントに渡す。

```jsx
const [toast, setToast] = useState(null);
const showError = (msg) => setToast({ message: msg, type: 'error' });
const showSuccess = (msg) => setToast({ message: msg, type: 'success' });

// JSX内
{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
```

**Step 3: useFinanceData.js のエラーハンドリング改善**

```javascript
// 変更前
} catch (e) {
  console.error("Failed to load data:", e);
}

// 変更後
} catch (e) {
  console.error("Failed to load data:", e);
  throw new Error("データの読み込みに失敗しました。ページを再読み込みしてください。");
}
```

各 `addAccount`, `editAccount`, ... 等のcallbackも同様にtry-catchを追加し、エラー時は呼び出し元にthrowする。

**Step 4: Reactエラーバウンダリを追加**

`frontend/src/components/ErrorBoundary.jsx` を新規作成する。

```jsx
// frontend/src/components/ErrorBoundary.jsx
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#f87171', textAlign: 'center' }}>
          <h2>予期しないエラーが発生しました</h2>
          <p style={{ fontSize: 14, color: '#6b7585' }}>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 16, padding: '8px 24px', cursor: 'pointer' }}>
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

`frontend/src/main.jsx` でアプリ全体を `<ErrorBoundary>` で囲む。

**Step 5: APIハンドラにtry-catchを追加**

全4ファイル（accounts.js, fixedPayments.js, creditCards.js, monthlyRecords.js）の各ハンドラに追加：

```javascript
// 変更後の構造
handler: async (request, context) => {
  const { authorized, user } = requireOwner(request);
  if (!authorized) return { status: 403 };

  try {
    const body = await request.json();
    // ... 処理 ...
    return { status: 201, jsonBody: result };
  } catch (e) {
    context.error('Handler error:', e);
    return { status: 500, jsonBody: { error: '内部エラーが発生しました' } };
  }
},
```

#### 検証方法

1. ネットワークを切断した状態でデータ操作を行い、画面右下にトースト通知が表示されること
2. APIで意図的にエラーを発生させ、500レスポンスと適切なエラーメッセージが返ること
3. Reactコンポーネントで例外を発生させ、エラーバウンダリが表示されること

---

### Issue #3: フォーム二重送信防止

**優先度:** 🔴 高　**工数:** S（半日以内）

#### 問題の概要

口座・固定支払い・クレジットカードの追加・編集モーダルで、送信中にボタンが無効化されないため、ユーザーが連打すると同じデータが複数回作成されます。

**影響範囲:**

| ファイル | 内容 |
|---------|------|
| `frontend/src/components/AccountsTab.jsx` | 追加・編集フォームの送信ボタン |
| `frontend/src/components/FixedPaymentsTab.jsx` | 追加・編集フォームの送信ボタン |
| `frontend/src/components/CreditCardsTab.jsx` | 追加・編集フォームの送信ボタン |

#### 解決アプローチ

**Step 1: 各タブコンポーネントにsubmitting状態を追加**

3ファイルすべてに同じパターンで対応する。AccountsTab.jsx を例に説明する。

```jsx
// 変更前
const [form, setForm] = useState({ name: '', balance: 0 });

// 変更後（submitting状態を追加）
const [form, setForm] = useState({ name: '', balance: 0 });
const [submitting, setSubmitting] = useState(false);
```

**Step 2: handleSubmit関数をsubmitting状態で囲む**

```jsx
// 変更前
const handleSubmit = async () => {
  if (modalMode === 'add') {
    await addAccount({ name: form.name, balance: Number(form.balance) });
  } else {
    await editAccount(editTarget.id, { name: form.name, balance: Number(form.balance) });
  }
  setShowModal(false);
};

// 変更後
const handleSubmit = async () => {
  if (submitting) return; // 二重送信防止
  setSubmitting(true);
  try {
    if (modalMode === 'add') {
      await addAccount({ name: form.name, balance: Number(form.balance) });
    } else {
      await editAccount(editTarget.id, { name: form.name, balance: Number(form.balance) });
    }
    setShowModal(false);
  } catch (e) {
    // Issue #2 のトースト通知と組み合わせてエラーを表示
    console.error(e);
  } finally {
    setSubmitting(false);
  }
};
```

**Step 3: 送信ボタンにdisabledとローディング表示を追加**

```jsx
// 変更前
<button onClick={handleSubmit}>保存</button>

// 変更後
<button onClick={handleSubmit} disabled={submitting}
  style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
  {submitting ? '保存中...' : '保存'}
</button>
```

同じ修正を `FixedPaymentsTab.jsx` と `CreditCardsTab.jsx` にも適用する。

#### 検証方法

1. 追加モーダルを開き、保存ボタンをすばやく複数回クリックしてデータが1件のみ作成されること
2. 送信中にボタンが「保存中...」と表示され、クリックできないこと
3. APIエラー時にボタンが再度有効になること（再試行できること）

---

## Phase 2: 中優先度タスク

> Phase 1のタスクと並行して作業できます。Phase 2内のIssueも互いに独立しています。

---

### Issue #4: ユーティリティ関数の集約

**優先度:** 🟡 中　**工数:** S（半日以内）

#### 問題の概要

同一の関数が複数ファイルで重複定義されており、一方を修正しても他方に反映されないバグが起きやすい状態です。

**重複している関数の一覧:**

| 関数名 | 重複しているファイル |
|--------|---------------------|
| `fmt(n)` — 金額を円表示 | `Dashboard.jsx:3`, `MonthlyTab.jsx:3` |
| `parseBonusMonths(str)` — ボーナス月パース | `Dashboard.jsx:7`, `FixedPaymentsTab.jsx:13` |
| `shiftMonth(yearMonth, delta)` — 月を移動 | `App.jsx:18` (実装), `MonthlyTab.jsx`でも使用 |
| `formatYearMonth(date)` — 日付からYYYY-MM | `App.jsx:26`, `MonthlyTab.jsx:9` |

#### 解決アプローチ

**Step 1: ユーティリティファイルを作成**

`frontend/src/utils/finance.js` を新規作成する。

```javascript
// frontend/src/utils/finance.js

/** 金額を日本円形式で表示 (例: ¥1,234,567) */
export function fmt(n) {
  return '¥' + Number(n || 0).toLocaleString('ja-JP');
}

/** カンマ区切りのボーナス月文字列を数値配列に変換 */
export function parseBonusMonths(str) {
  if (!str) return [];
  return str.split(',').map(Number).filter((n) => n >= 1 && n <= 12);
}

/** YYYY-MM形式の年月をdelta月分移動する */
export function shiftMonth(yearMonth, delta) {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Dateオブジェクトを YYYY-MM 形式に変換 */
export function formatYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
```

**Step 2: 各ファイルの重複定義を削除し、インポートに置き換える**

変更対象ファイルと削除する行：

- `Dashboard.jsx` — `fmt`と`parseBonusMonths`の定義を削除し `import { fmt, parseBonusMonths } from '../utils/finance'` を追加
- `MonthlyTab.jsx` — `fmt`と`formatYearMonth`の定義を削除し同様にインポート
- `FixedPaymentsTab.jsx` — `parseBonusMonths`の定義を削除しインポート
- `App.jsx` — `shiftMonth`と`formatYearMonth`の定義を削除しインポート

#### 検証方法

1. `npm run test` が全件パスすること
2. アプリを起動し、各タブが正常に表示・動作すること（金額表示、ボーナス月ハイライト等）

---

### Issue #5: テストカバレッジの強化

**優先度:** 🟡 中　**工数:** L（3日以上）

#### 問題の概要

現在テストが存在するのは `auth.js` と `Dashboard.jsx` と一部UIコンポーネントのみです。
APIエンドポイント・エラーシナリオ・統合テストが欠けており、リグレッションの検出が困難です。

**現在のテスト状況:**

| テスト対象 | 状況 |
|-----------|------|
| `api/src/shared/auth.js` | ✅ 完備 |
| `frontend/src/components/Dashboard.jsx` | ✅ ある程度完備 |
| `frontend/src/components/ui/*` | ✅ 基本的なテストあり |
| `api/src/functions/*.js` | ❌ テストなし |
| `frontend/src/hooks/useFinanceData.js` | ❌ テストなし |
| エラーシナリオ | ❌ ほぼなし |
| 統合テスト・E2Eテスト | ❌ なし |

#### 解決アプローチ

**Step 1: APIエンドポイントのユニットテスト追加**

`api/src/__tests__/accounts.test.js` を新規作成する（他3エンドポイントも同様）。

テスト戦略：
- `@azure/data-tables` をモック化してAzure依存を排除
- `auth.js` の `requireOwner` をモック化
- 正常系（201/200/204）と異常系（403/400/500）を各ハンドラでテスト

```javascript
// api/src/__tests__/accounts.test.js の構成例
describe('accounts-list', () => {
  test('認証済みユーザーは口座一覧を取得できる', async () => { /* ... */ });
  test('未認証ユーザーは403を受け取る', async () => { /* ... */ });
});

describe('accounts-create', () => {
  test('有効なデータで口座を作成できる', async () => { /* ... */ });
  test('nameが空の場合400を受け取る', async () => { /* ... */ }); // Issue #1実装後
  test('DBエラー時は500を受け取る', async () => { /* ... */ });   // Issue #2実装後
});
// ... 以下、accounts-update, accounts-delete も同様
```

**Step 2: useFinanceDataフックのテスト追加**

`frontend/src/hooks/__tests__/useFinanceData.test.js` を新規作成する。

- `frontend/src/api/client.js` をモック化
- `renderHook` を使用（`@testing-library/react`）
- テストケース: 正常読み込み、読み込みエラー時、CRUD操作の状態反映

**Step 3: エラーシナリオテストをDashboard.test.jsxに追加**

```javascript
// 追加するテストケース例
test('データ読み込み失敗時にエラーメッセージを表示する', async () => { /* ... */ });
test('口座追加失敗時にトースト通知が表示される', async () => { /* ... */ }); // Issue #2実装後
```

**Step 4: コードカバレッジ計測の設定**

`frontend/vitest.config.js` にカバレッジ設定を追加：

```javascript
// frontend/vitest.config.js
export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/'],
      thresholds: { lines: 70, branches: 60 }, // 目標値（段階的に引き上げる）
    },
  },
});
```

#### 検証方法

1. `npm test -- --coverage` を実行しカバレッジレポートが出力されること
2. 新規追加したすべてのテストがパスすること
3. 既存テストが引き続きパスすること

---

### Issue #6: DevOps改善

**優先度:** 🟡 中　**工数:** M（1〜2日）

#### 問題の概要

CI/CDパイプラインにセキュリティスキャンとカバレッジレポートが欠けており、依存パッケージの自動更新もされていません。

**現在の `.github/workflows/ci-cd.yml` の問題点:**

- `npm audit` によるセキュリティスキャンなし
- テストカバレッジの収集・レポートなし
- Dependabotの設定なし
- ステージング環境へのデプロイなし

#### 解決アプローチ

**Step 1: CI/CDにセキュリティスキャンを追加**

`.github/workflows/ci-cd.yml` の `build-test-frontend` ジョブに追加：

```yaml
- name: Security audit (frontend)
  run: npm audit --audit-level=high
  # highまたはcritical脆弱性があればCIを失敗させる
```

同様に `test-api` ジョブにも追加。

**Step 2: カバレッジレポートの収集**

```yaml
- name: Run tests with coverage
  run: npm run test -- --coverage

- name: Upload coverage report
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: frontend/coverage/
    retention-days: 7
```

**Step 3: Dependabotの設定**

`.github/dependabot.yml` を新規作成する：

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "npm"
    directory: "/api"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

**Step 4: （任意）ステージング環境の追加**

`main` ブランチへのマージ前に `staging` 環境へデプロイするステップを追加する（Azure SWAの環境設定が必要なため、インフラチームと調整）。

#### 検証方法

1. プルリクエストを作成し、`npm audit` ステップがCIで実行されること
2. カバレッジレポートがArtifactとしてダウンロードできること
3. Dependabotからの自動PRが週次で作成されること

---

### Issue #7: モニタリング・ロギングの導入

**優先度:** 🟡 中　**工数:** M（1〜2日）

#### 問題の概要

現在、本番環境でエラーが発生しても検知・追跡する手段がありません。
APIハンドラはAzure Functionsの `context.log` をほとんど使用しておらず、フロントエンドエラーも収集されていません。

#### 解決アプローチ

**Step 1: APIハンドラに構造化ログを追加**

各ハンドラの開始時・エラー時にログを追加する。

```javascript
// 各ハンドラのtry-catch内に追加（Issue #2と合わせて実施）
handler: async (request, context) => {
  const { authorized, user } = requireOwner(request);
  if (!authorized) {
    context.warn('Unauthorized access attempt', { url: request.url });
    return { status: 403 };
  }

  context.log('accounts-create: start', { userId: user.userId });
  try {
    // ... 処理 ...
    context.log('accounts-create: success', { userId: user.userId, id });
    return { status: 201, jsonBody: result };
  } catch (e) {
    context.error('accounts-create: error', { userId: user.userId, error: e.message });
    return { status: 500, jsonBody: { error: '内部エラーが発生しました' } };
  }
},
```

**Step 2: Azure Application Insightsの接続設定**

`api/local.settings.json`（ローカル）と Azure ポータルのアプリケーション設定に以下を追加：

```json
{
  "Values": {
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "<接続文字列>"
  }
}
```

Azure Functions は接続文字列が設定されると自動的にApplication Insightsにログを送信します。

**Step 3: フロントエンドのエラー収集（任意・発展）**

`frontend/src/components/ErrorBoundary.jsx`（Issue #2で作成）の `componentDidCatch` で Application Insights SDKにエラーを送信する。

```bash
npm install @microsoft/applicationinsights-web
```

#### 検証方法

1. APIを呼び出し、Azure PortalのApplication Insights → ライブメトリクスで通信が確認できること
2. 意図的にエラーを発生させ、Application Insightsの「失敗」セクションに記録されること
3. ローカル開発時、`func start` のターミナルにログが出力されること

---

### Issue #8: アクセシビリティ対応

**優先度:** 🟡 中　**工数:** M（1〜2日）

#### 問題の概要

現在のUIにはARIA属性がなく、スクリーンリーダーのユーザーやキーボード操作のみのユーザーがアプリを正しく使えません。

**主な問題点:**

| ファイル | 問題 |
|---------|------|
| `frontend/src/components/ui/Modal.jsx` | `role="dialog"`, `aria-modal`, `aria-labelledby` がない |
| `frontend/src/components/ui/InputField.jsx` | `aria-required`, `aria-describedby` がない |
| `frontend/src/App.jsx` | ハンバーガーメニューボタンに `aria-label`, `aria-expanded` がない |
| 各タブの削除ボタン | `aria-label` がない（「削除」という文字なしのアイコンボタンが想定される） |

#### 解決アプローチ

**Step 1: Modalコンポーネントを修正**

`frontend/src/components/ui/Modal.jsx` に以下を追加：

```jsx
// Modal に titleId prop を追加
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby={titleId || 'modal-title'}
>
  <h2 id={titleId || 'modal-title'}>{title}</h2>
  {/* ... */}
</div>
```

**Step 2: InputFieldコンポーネントを修正**

`frontend/src/components/ui/InputField.jsx` に以下を追加：

```jsx
<input
  aria-required={required ? 'true' : undefined}
  aria-describedby={hint ? `${id}-hint` : undefined}
  id={id}
  {...props}
/>
{hint && <p id={`${id}-hint`} style={{ fontSize: 12, color: '#6b7585' }}>{hint}</p>}
```

**Step 3: ナビゲーションボタンを修正**

`frontend/src/App.jsx` のハンバーガーメニューボタン：

```jsx
<button
  aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
  aria-expanded={menuOpen}
  onClick={() => setMenuOpen(!menuOpen)}
>
```

**Step 4: カラーコントラストの確認**

ブラウザの開発者ツール（Lighthouseまたはaxe拡張）でコントラスト比を確認し、WCAG AA基準（4.5:1以上）を満たしているか確認する。現在使用中のグレー `#6b7585`（背景 `#161b24`）は確認が必要。

#### 検証方法

1. ブラウザの開発者ツール → Lighthouse → Accessibility スコアを計測（目標: 80以上）
2. キーボード（Tabキー）のみでモーダルを開き、操作し、閉じられること
3. スクリーンリーダー（macOSのVoiceOver等）でモーダルタイトルが読み上げられること

---

## Phase 3: 低優先度タスク

---

### Issue #9: CSSアーキテクチャの整理

**優先度:** 🟢 低　**工数:** L（3日以上）

#### 問題の概要

現在のスタイリングはインラインstyleオブジェクトと `<style>` タグ埋め込みが混在しており、テーマの一元管理ができていません。カラー値がコード中に散在しているため、デザイン変更時に多数のファイルを修正する必要があります。

**現在の問題:**

- `Dashboard.jsx:28` ほか多数: `#161b24`, `#1e2530`, `#6b7585`, `#e4e8ef` などが散在
- `Dashboard.jsx:15–53` に `<style>` タグでCSS文字列を埋め込んでいる
- `App.jsx:37–118` に大きなCSS文字列がハードコード

#### 解決アプローチ

**Step 1: CSS変数ファイルの作成**

`frontend/src/styles/variables.css` を新規作成する：

```css
:root {
  /* 背景色 */
  --color-bg-primary: #0d1117;
  --color-bg-secondary: #161b24;
  --color-bg-card: #1a2030;

  /* ボーダー */
  --color-border: #1e2530;

  /* テキスト */
  --color-text-primary: #e4e8ef;
  --color-text-secondary: #6b7585;
  --color-text-accent: #8badd9;

  /* ステータス */
  --color-success: #6ee7a0;
  --color-error: #f87171;
  --color-warning: #f0c060;

  /* スペーシング */
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

**Step 2: main.jsx でCSS変数ファイルをインポート**

```javascript
import './styles/variables.css';
```

**Step 3: インラインstyleをCSS変数に段階的に置き換え**

優先度の高いコンポーネントから順に置き換えを行う。一度にすべてを変更するとレグレッションのリスクがあるため、コンポーネント単位で進める。

#### 検証方法

1. 全コンポーネントの表示が変更前後で同一であること（スクリーンショット比較）
2. CSS変数を変更するだけでテーマカラーが全体に反映されること

---

### Issue #10: パフォーマンス・キャッシング改善

**優先度:** 🟢 低　**工数:** M（1〜2日）

#### 問題の概要

現在は月が変わるたびに口座・固定支払い・クレジットカードのデータをフルフェッチしていますが、これらは月をまたいでも変化しないデータです。また、データ件数が増加した場合にページネーションがないため、ロード時間が増大する可能性があります。

**影響ファイル:** `frontend/src/hooks/useFinanceData.js:14–36`

#### 解決アプローチ

**Step 1: マスターデータとサマリーデータを分離**

`useFinanceData.js` の `loadAll` を以下のように分離する：

- `loadMasterData()` — 口座・固定支払い・カード（初回のみフェッチ、yearMonth変更では再フェッチしない）
- `loadMonthlyData(yearMonth)` — 月次記録のみ（yearMonth変更時に再フェッチ）

```javascript
// 変更後の構造
useEffect(() => {
  loadMasterData(); // マスターデータ：初回のみ
}, []);

useEffect(() => {
  loadMonthlyData(yearMonth); // 月次データ：月変更時
}, [yearMonth]);
```

**Step 2: SWRの導入検討（任意・発展）**

将来的にはSWR（`npm install swr`）を使用することで、キャッシング・再検証・エラーリトライを宣言的に扱えます。ただし、現在の `useFinanceData` フックを大幅に書き替える必要があるため、Phase 3以降での検討とします。

#### 検証方法

1. 月を切り替えた際にマスターデータのAPIリクエストが発生しないこと（ブラウザのネットワークタブで確認）
2. 月次データが正しく切り替わること

---

## Phase 4: TypeScript移行

**優先度:** 🔵 大規模　**工数:** XL（1〜2週間）

> ⚠️ このPhaseは他のPhaseから独立しています。着手前にチームで計画を立ててください。

#### 問題の概要

現在のコードはすべてJavaScript（.js/.jsx）で書かれており、型安全性がありません。
コンパイル時に型エラーを検出できないため、APIレスポンスの形状変更やPropsの誤りがランタイムエラーとして現れます。

TypeScript化により以下のメリットが得られます：
- IDEの補完・リファクタリング精度向上
- APIレスポンス型の共有による型安全なデータフロー
- 型定義がドキュメントとして機能

#### 解決アプローチ

**移行戦略：段階的（点進的）移行**

一括変換はリスクが高いため、ファイル単位で段階的に移行します。

**Step 1: フロントエンドにTypeScriptを導入**

```bash
cd frontend
npm install -D typescript @types/react @types/react-dom
npx tsc --init
```

`vite.config.js` はViteがTSを自動サポートするため変更不要。

**Step 2: 共有型定義ファイルの作成**

`frontend/src/types/finance.ts` を新規作成する：

```typescript
export interface Account {
  id: string;
  name: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface FixedPayment {
  id: string;
  name: string;
  amount: number;
  accountId: string;
  bonusMonths: string; // カンマ区切り
  bonusAmount: number;
  createdAt: string;
}

export interface CreditCard {
  id: string;
  name: string;
  accountId: string;
  createdAt: string;
}

export interface MonthlyRecords {
  accountBalances: Record<string, number>;
  cardPayments: Record<string, number>;
}
```

**Step 3: ファイルを優先度順に.tsxに変換**

変換推奨順序（依存関係の少ないものから）：

1. `frontend/src/types/finance.ts` — 型定義（新規）
2. `frontend/src/utils/finance.ts` — ユーティリティ（Issue #4で作成済み）
3. `frontend/src/api/client.ts` — APIクライアント（型付きレスポンス）
4. `frontend/src/components/ui/*.tsx` — UIコンポーネント（Props型定義）
5. `frontend/src/hooks/useFinanceData.ts` — カスタムフック
6. `frontend/src/components/*.tsx` — 各タブコンポーネント
7. `frontend/src/App.tsx`, `frontend/src/main.tsx` — エントリポイント

**Step 4: `tsconfig.json` の設定**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noImplicitAny": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

> 注: `strict: true` を最初から有効にすることを推奨。後から有効にすると修正範囲が大きくなる。

**Step 5: APIハンドラ（Node.js）の型付け（任意）**

Azure Functions v4はTypeScriptをサポートしています。APIハンドラも同様に `.ts` に移行することで、フロントエンドと型定義を共有できます（monorepoツールが必要）。

#### 検証方法

1. `npx tsc --noEmit` がエラーなしで完了すること
2. `npm run build` が成功すること
3. 既存のVitest/Jestテストが引き続きパスすること
4. IDEでPropsや戻り値の型補完が機能すること

---

## 付録：プロジェクト概要

### アーキテクチャ

```
フロントエンド (React 18 + Vite)
  └── frontend/src/
      ├── App.jsx          ← 全体レイアウト・ルーティング
      ├── api/client.js    ← HTTP通信クライアント
      ├── hooks/
      │   └── useFinanceData.js  ← データ取得・状態管理
      └── components/
          ├── Dashboard.jsx
          ├── AccountsTab.jsx
          ├── FixedPaymentsTab.jsx
          ├── CreditCardsTab.jsx
          ├── MonthlyTab.jsx
          └── ui/               ← 再利用コンポーネント

バックエンド (Azure Functions + Azure Table Storage)
  └── api/src/
      ├── functions/
      │   ├── accounts.js
      │   ├── fixedPayments.js
      │   ├── creditCards.js
      │   └── monthlyRecords.js
      └── shared/
          ├── auth.js        ← 認証ロジック
          └── tableClient.js ← DB接続

CI/CD: GitHub Actions → Azure Static Web Apps
認証: GitHub OAuth（Azure SWA管理）
```

### ローカル開発環境のセットアップ

```bash
# フロントエンド
cd frontend && npm install && npm run dev  # port 5173

# バックエンド（Azure Functions Core Tools が必要）
cd api && npm install && npm run start     # port 7071

# 認証シミュレーター（Azure Static Web Apps CLI が必要）
npx @azure/static-web-apps-cli start --api-devserver-url http://localhost:7071
# port 4280
```
