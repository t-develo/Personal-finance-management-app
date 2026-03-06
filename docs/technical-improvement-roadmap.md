# 技術改善ロードマップ — Personal Finance App

> **対象プロジェクト:** Personal Finance Management App（個人家計管理アプリ）
> **作成日:** 2026-03-05
> **ステータス:** レビュー済み・実装待ち

---

## クイックリファレンス

| Task ID | タイトル | 優先度 | 工数 | 依存 | 並行実施可能な対象 |
|---------|---------|--------|------|------|-----------------|
| TASK-01 | APIバリデーション追加 | 🔴 高 | M | なし | TASK-02, 06, 09, 10 |
| TASK-02 | APIエラーハンドリング強化 | 🔴 高 | M | なし | TASK-01, 06, 09, 10 |
| TASK-03 | フロントエンドエラーハンドリング | 🔴 高 | M | TASK-02 | TASK-07 |
| TASK-04 | セキュリティ強化 | 🔴 高 | M | TASK-01 | TASK-03, 07 |
| TASK-05 | ユーティリティ関数の集約 | 🟡 中 | S | なし | TASK-09, 10, 12 |
| TASK-06 | フォーム送信ローディング状態 | 🟡 中 | S | なし | TASK-01, 02, 09, 10 |
| TASK-07 | テストカバレッジ — API | 🟡 中 | M | TASK-01, 02 | TASK-03, 04 |
| TASK-08 | テストカバレッジ — フロントエンド | 🟡 中 | M | TASK-03 | TASK-11, 13 |
| TASK-09 | DevOps / CI改善 | 🟡 中 | S | なし | TASK-05, 10, 12 |
| TASK-10 | モニタリング・ロギング | 🟡 中 | M | なし | TASK-05, 09, 12 |
| TASK-11 | CSSアーキテクチャ整理 | 🟢 低 | L | なし | TASK-08, 13 |
| TASK-12 | アクセシビリティ対応 | 🟡 中 | M | なし | TASK-05, 09, 10 |
| TASK-13 | パフォーマンス・キャッシング | 🟢 低 | M | TASK-03 | TASK-08, 11 |

工数目安: S = 半日以内、M = 1〜2日、L = 3日以上

---

## このドキュメントの読み方

- **各Taskセクションは自己完結**しています。他のセクションを読まなくても着手できます。
- **ファイルパスはリポジトリルートからの相対パス**です。
- **優先度の定義:** 高 = セキュリティ・データ整合性のリスク、中 = 保守性・UXの低下、低 = 将来的な改善
- **アプリはJavaScript/JSX（TypeScriptなし）**です。このドキュメントのサンプルコードもすべてJSです。
- **デプロイ環境はAzure Static Web Apps (SWA)**です。`api/` と `frontend/` は同じCI/CDパイプラインでデプロイされます。

---

## 作業順序と依存関係グラフ

```
Tier 0 — 依存なし（今すぐ開始可能）
  TASK-05  ユーティリティ関数集約      → frontend/src/ のみ
  TASK-09  DevOps/CI改善              → .github/ のみ
  TASK-10  モニタリング・ロギング      → api/src/functions/ のみ
  TASK-12  アクセシビリティ対応        → Modal.jsx, App.jsx, InputField.jsx

Tier 1 — Tier 0マージ後に開始推奨
  TASK-01  APIバリデーション           → TASK-10があると構造化ログと統合しやすい
  TASK-02  APIエラーハンドリング        → TASK-10があるとcatch内ログが整合する
  TASK-06  フォーム送信ローディング状態 → TASK-05後のほうが差分が小さい

Tier 2 — Tier 1マージ後に開始
  TASK-03  フロントエンドエラーハンドリング → TASK-02が必要（APIエラー形式が確定してから）
  TASK-07  テストカバレッジ — API         → TASK-01, 02が必要（検証対象コードが存在してから）
  TASK-04  セキュリティ強化               → TASK-01が完了してから上位の制御を重ねる

Tier 3 — 後期改善
  TASK-08  テストカバレッジ — フロントエンド → TASK-03完了後（エラーバウンダリなどをテスト可能に）
  TASK-11  CSSアーキテクチャ整理           → 独立。他PRとのコンフリクト回避のため単独スプリントで
  TASK-13  パフォーマンス・キャッシング    → TASK-03完了後（キャッシュ中のエラー処理が安定してから）
```

---

## 並行実施マップ

### 今すぐ開始できる作業（前提条件なし）

以下の4タスクはファイルの重複がなく、同時に4名が着手できます：

| 担当者 | Task | 主な変更ファイル |
|--------|------|----------------|
| A | TASK-05 ユーティリティ集約 | frontend/src/utils/finance.js（新規）、各コンポーネント上部 |
| B | TASK-09 DevOps/CI | .github/workflows/ci-cd.yml、.github/dependabot.yml（新規） |
| C | TASK-10 モニタリング | api/src/functions/*.js の context.log 追加 |
| D | TASK-12 アクセシビリティ | Modal.jsx、App.jsx、MonthlyTab.jsx、InputField.jsx |

### Sprint 2（Tier 0マージ後）

- TASK-01（バックエンドのみ）+ TASK-06（フロントエンドのみ）は同時着手可能
- TASK-02 は TASK-01 と同時着手可能（異なるコードパスを編集）

### Sprint 3（Tier 1マージ後）

- TASK-03 と TASK-07 は同時着手可能（フロントエンド vs テスト）
- TASK-04 は TASK-01 マージ後に開始

---

## Taskカタログ

---

### TASK-01: APIエンドポイントへの入力バリデーション追加

| 項目 | 内容 |
|------|------|
| 優先度 | 🔴 高 |
| 工数 | M（1〜2日） |
| 依存 | なし |

#### 問題

すべてのAPIエンドポイントで、リクエストボディの入力値が検証されていません。`body.name` が空文字・undefined・超長文字列であってもそのままAzure Table Storageに保存されます。`body.balance` は `NaN` や `Infinity` でも通過します。また、`monthlyRecords.js` の `yearMonth` ルートパラメータはODataフィルタ文字列に直接埋め込まれており、OData Injectionのリスクがあります。

#### 対象ファイル

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `api/src/functions/accounts.js` | 44, 80 | `await request.json()` の直後にバリデーションなし |
| `api/src/functions/accounts.js` | 20 | `` filter: `PartitionKey eq '${user.userId}'` `` OData文字列補間 |
| `api/src/functions/accounts.js` | 115–116 | deleteCascadeのOData二重補間 |
| `api/src/functions/fixedPayments.js` | 46, 86 | 同様のパターン |
| `api/src/functions/creditCards.js` | 43, 69 | 同様のパターン |
| `api/src/functions/monthlyRecords.js` | 23 | `yearMonth` をODataフィルタに直接補間 |
| `api/src/functions/monthlyRecords.js` | 48 | `yearMonth` をRowKeyに直接使用 |

#### アプローチ

1. `api/src/shared/validate.js` を新規作成し、純粋なバリデーション関数をエクスポートする。

   ```javascript
   // api/src/shared/validate.js
   function validateString(value, fieldName, { maxLength = 100 } = {}) {
     if (value === undefined || value === null || value === '') {
       return `${fieldName} は必須です`;
     }
     if (typeof value !== 'string') return `${fieldName} は文字列である必要があります`;
     if (value.trim().length === 0) return `${fieldName} は空白のみにできません`;
     if (value.length > maxLength) return `${fieldName} は${maxLength}文字以内にしてください`;
     return null;
   }

   function validateAmount(value, fieldName) {
     const num = Number(value);
     if (!isFinite(num)) return `${fieldName} は有効な数値である必要があります`;
     if (num < -999999999 || num > 999999999) return `${fieldName} の値が範囲外です`;
     return null;
   }

   function validateYearMonth(value) {
     if (!/^\d{4}-\d{2}$/.test(value)) return 'yearMonth は YYYY-MM 形式にしてください';
     const [year, month] = value.split('-').map(Number);
     if (month < 1 || month > 12) return '月は1〜12の範囲にしてください';
     if (year < 2000 || year > 2100) return '年は2000〜2100の範囲にしてください';
     return null;
   }

   module.exports = { validateString, validateAmount, validateYearMonth };
   ```

2. 各ハンドラの `request.json()` 直後にバリデーションを追加する。バリデーションエラー時は即座に `{ status: 400, jsonBody: { error: "..." } }` を返す。

3. ODataフィルタ文字列には `@azure/data-tables` の `odata` タグドテンプレートを使用してエスケープする。

   ```javascript
   import { odata } from '@azure/data-tables';
   // 変更前
   filter: `PartitionKey eq '${user.userId}'`
   // 変更後
   filter: odata`PartitionKey eq ${user.userId}`
   ```

   全4ファイルのすべてのフィルタクエリに適用する。`user.userId` はSWAが発行したJWTから取得するため低リスクだが、`yearMonth` やルートパラメータの `id` は必ずパターン検証を行う。

4. フィールドの制限値: 名称・カード名は最大100文字、金額は有限数かつ `-999999999` 〜 `999999999`。

5. `api/src/__tests__/validate.test.js` を新規作成し、各バリデーション関数のユニットテストを追加する。

#### 検証チェックリスト

- [ ] `POST /api/accounts` で `name: ""` を送ると400が返ること
- [ ] `POST /api/accounts` で `name: "a".repeat(101)` を送ると400が返ること
- [ ] `POST /api/accounts` で `balance: "abc"` を送ると400が返ること
- [ ] `GET /api/monthlyRecords/invalid-format` で400が返ること
- [ ] 有効なリクエストが引き続き200/201を返すこと
- [ ] 既存のテストがすべてパスすること

---

### TASK-02: APIエラーハンドリング強化

| 項目 | 内容 |
|------|------|
| 優先度 | 🔴 高 |
| 工数 | M（1〜2日） |
| 依存 | なし |

#### 問題

4つのAPIハンドラファイルいずれも、Azure Table Storage SDKの呼び出しをtry-catchで囲んでいません。接続障害・権限エラー・SDK例外が発生すると、Azure Functionsランタイムが未処理例外をキャッチし、スタックトレースを含む生の500レスポンスを返します。フロントエンドの `client.js:18-21` は `res.text()` でエラーボディを読むため、ユーザーには生のスタックトレースが表示されます。

#### 対象ファイル

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `api/src/functions/accounts.js` | 12–33, 40–68, 75–96, 102–148 | 全ハンドラにtry-catchなし |
| `api/src/functions/fixedPayments.js` | 全ハンドラ | 同様 |
| `api/src/functions/creditCards.js` | 全ハンドラ | 同様 |
| `api/src/functions/monthlyRecords.js` | 全ハンドラ | 同様 |
| `api/src/shared/auth.js` | 5 | `JSON.parse` がtry-catchなし（base64が不正な場合にクラッシュ） |

#### アプローチ

1. 全4ファイルの各ハンドラ本体全体を `try { ... } catch (err) { ... }` で囲む。

   ```javascript
   handler: async (request, context) => {
     const { authorized, user } = requireOwner(request);
     if (!authorized) return { status: 403 };

     try {
       const body = await request.json();
       // ... 処理 ...
       return { status: 201, jsonBody: result };
     } catch (err) {
       context.error('Handler error', { route: request.url, userId: user?.userId, error: err.message });
       return { status: 500, jsonBody: { error: '内部エラーが発生しました' } };
     }
   },
   ```

2. `accounts.js` のdeleteカスケード処理（行111–145）は、プライマリ削除とは別のtry-catchで囲む。カスケード失敗はログするがプライマリ削除の成功レスポンスはそのまま返す。

3. `auth.js` の `JSON.parse`（行5）をtry-catchで囲み、パース失敗時は `null` を返す。

#### 検証チェックリスト

- [ ] `@azure/data-tables` のモックがエラーをthrowするとき、ハンドラが500を返すこと
- [ ] 500レスポンスのボディに `{ error: "内部エラーが発生しました" }` が含まれること（スタックトレースが含まれないこと）
- [ ] `context.error` が呼ばれること（jest.spyOn で確認）
- [ ] `auth.js` に不正なbase64を渡すと `null` が返ること

---

### TASK-03: フロントエンドエラーハンドリング

| 項目 | 内容 |
|------|------|
| 優先度 | 🔴 高 |
| 工数 | M（1〜2日） |
| 依存 | TASK-02（APIエラーレスポンスの形式が確定してから） |

#### 問題

フロントエンドには3つのサイレントエラー層があります。(1) `useFinanceData.js:27` でデータ読み込み失敗を `console.error` のみで処理し、ユーザーには何も伝えない。(2) `AccountsTab.jsx:99`、`FixedPaymentsTab.jsx:149`、`CreditCardsTab.jsx:106` の `handleSubmit` にtry-catchがなく、保存失敗がユーザーに伝わらない。(3) `MonthlyTab.jsx:124` のデバウンス `save()` にtry-catchがなく、保存失敗が無音で消える。ReactエラーバウンダリもApp全体にない。

#### 対象ファイル

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `frontend/src/hooks/useFinanceData.js` | 27 | `console.error("Failed to load data:", e)` のみ |
| `frontend/src/components/MonthlyTab.jsx` | 124–130 | デバウンスsaveにtry-catchなし |
| `frontend/src/components/AccountsTab.jsx` | 99 | handleSubmitにtry-catchなし |
| `frontend/src/components/FixedPaymentsTab.jsx` | 149 | 同様 |
| `frontend/src/components/CreditCardsTab.jsx` | 106 | 同様 |
| `frontend/src/App.jsx` | 全体 | ErrorBoundaryなし |

#### アプローチ

1. `frontend/src/components/ui/Toast.jsx` を新規作成する。

   ```jsx
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
         <button onClick={onClose} aria-label="閉じる" style={{
           marginLeft: 12, background: 'none', border: 'none',
           color: '#fff', cursor: 'pointer', fontSize: 16,
         }}>×</button>
       </div>
     );
   }
   ```

2. `frontend/src/components/ErrorBoundary.jsx` を新規作成する（クラスコンポーネント）。`componentDidCatch` でログを記録し、フォールバックUIを表示する。`frontend/src/main.jsx` でアプリ全体を `<ErrorBoundary>` で囲む。

3. `App.jsx` にトースト状態を追加する。

   ```jsx
   const [toast, setToast] = useState(null);
   const showError = (msg) => setToast({ message: msg, type: 'error' });
   const showSuccess = (msg) => setToast({ message: msg, type: 'success' });
   // JSX内
   {toast && <Toast {...toast} onClose={() => setToast(null)} />}
   ```

4. `useFinanceData.js` の `loadAll` catchブロックで `showError()` を呼ぶ。`useFinanceData` の引数に `{ onError }` コールバックを追加するか、エラー状態を返す。

5. `AccountsTab`、`FixedPaymentsTab`、`CreditCardsTab` の各 `handleSubmit` をtry-catchで囲み、catchで `showError()` を呼ぶ。失敗時はモーダルを閉じない（`setModal(null)` を finally ではなく try の末尾に移動）。

6. `MonthlyTab.jsx` の `save()` をtry-catchで囲み、失敗時はトーストエラーを表示し、「保存しました」インジケーターを非表示にする。

#### 検証チェックリスト

- [ ] ネットワーク切断状態でデータ操作を行い、トーストが表示されること
- [ ] 保存失敗時にモーダルが開いたままになること（閉じないこと）
- [ ] コンポーネントで例外を発生させ、エラーバウンダリが表示されること
- [ ] エラー後もアプリが回復可能であること

---

### TASK-04: セキュリティ強化

| 項目 | 内容 |
|------|------|
| 優先度 | 🔴 高 |
| 工数 | M（1〜2日） |
| 依存 | TASK-01 |

#### 問題

TASK-01（バリデーション）とは別に3つのセキュリティギャップがあります。(1) `client.js:13` が `/.auth/login/github` をハードコードしており、認証プロバイダをGitHubに固定している。(2) `staticwebapp.config.json:33` のCSPに `script-src 'unsafe-inline'` が含まれており、XSS防御を弱体化させている。(3) すべてのエンドポイントにレート制限がない。

#### 対象ファイル

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `frontend/src/api/client.js` | 13 | `/.auth/login/github` ハードコード |
| `frontend/public/staticwebapp.config.json` | 33 | `script-src 'self' 'unsafe-inline'` |
| `api/src/functions/accounts.js` | 10 | `authLevel: "anonymous"` にコメントなし（他3ファイルも同様） |

#### アプローチ

1. `client.js:13` の `/.auth/login/github` を `/.auth/login` に変更する。SWAは設定からIDプロバイダを動的に解決する。

2. `staticwebapp.config.json` のCSPを修正する。`script-src` から `'unsafe-inline'` を削除する。`style-src` の `'unsafe-inline'` はインラインスタイルのために現時点では維持する（TASK-11のCSS整理後に段階的に除去する）。

   ```json
   "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'"
   ```

3. 全4ハンドラファイルの `authLevel: "anonymous"` の上にコメントを追加する。

   ```javascript
   // authLevel: "anonymous" はAzure Functionsのキー認証を無効化する設定です。
   // エンドポイントが公開という意味ではありません。
   // SWAが staticwebapp.config.json のルールに基づいてエッジで認証を強制し、
   // 未認証リクエストはこの関数に到達する前にブロックされます。
   ```

4. `api/host.json` にタイムアウト設定を追加する。Azure Functionsのコンカレンシー設定でリソース消費を制限する（`functionTimeout` および `maxConcurrentConnections`）。

5. CI/CDの両ジョブに `npm audit --audit-level=high` を追加する（TASK-09と調整して重複を避ける）。

#### 検証チェックリスト

- [ ] ブラウザコンソールでCSPエラーが出ないこと
- [ ] ログインボタンが `/.auth/login` に遷移すること
- [ ] ネットワークタブでレスポンスヘッダーの `Content-Security-Policy` が更新されていること
- [ ] `npm audit` でhigh/critical脆弱性がないこと

---

### TASK-05: ユーティリティ関数の集約

| 項目 | 内容 |
|------|------|
| 優先度 | 🟡 中 |
| 工数 | S（半日以内） |
| 依存 | なし |

#### 問題

同一の関数が複数ファイルで重複定義されています。`fmt(n)`（円表示）は `Dashboard.jsx:3`、`AccountsTab.jsx:3`、`FixedPaymentsTab.jsx:7`、`MonthlyTab.jsx:3` の4箇所に存在します。`parseBonusMonths(str)` は `Dashboard.jsx:7` と `FixedPaymentsTab.jsx:13` の2箇所。`shiftMonth(ym, delta)` は `App.jsx:23` と `MonthlyTab.jsx:12` の2箇所。`formatYearMonth(ym)` は `App.jsx:29` と `MonthlyTab.jsx:7` の2箇所。いずれかを修正しても他の定義には反映されない。

#### 対象ファイル

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `frontend/src/App.jsx` | 23–32 | `shiftMonth` と `formatYearMonth` の定義 |
| `frontend/src/components/Dashboard.jsx` | 3–13 | `fmt` と `parseBonusMonths` の定義 |
| `frontend/src/components/AccountsTab.jsx` | 6–8 | `fmt` の定義 |
| `frontend/src/components/FixedPaymentsTab.jsx` | 7–19 | `fmt` と `parseBonusMonths` の定義 |
| `frontend/src/components/MonthlyTab.jsx` | 3–16 | `fmt`、`formatYearMonth`、`shiftMonth` の定義 |

#### アプローチ

1. `frontend/src/utils/finance.js` を新規作成し、4つの関数をエクスポートする。実装は既存の各定義をそのままコピーする（この時点で動作変更は行わない）。

   ```javascript
   // frontend/src/utils/finance.js
   export function fmt(n) {
     return '¥' + Number(n || 0).toLocaleString('ja-JP');
   }
   export function parseBonusMonths(str) {
     if (!str) return [];
     return str.split(',').map(Number).filter((n) => n >= 1 && n <= 12);
   }
   export function shiftMonth(yearMonth, delta) {
     const [y, m] = yearMonth.split('-').map(Number);
     const d = new Date(y, m - 1 + delta);
     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
   }
   export function formatYearMonth(date) {
     return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
   }
   ```

2. 各ファイルのローカル定義を削除し、インポートに置き換える。
   - `App.jsx`: `import { shiftMonth, formatYearMonth } from './utils/finance'`
   - `Dashboard.jsx`: `import { fmt, parseBonusMonths } from '../utils/finance'`
   - `AccountsTab.jsx`: `import { fmt } from '../utils/finance'`
   - `FixedPaymentsTab.jsx`: `import { fmt, parseBonusMonths } from '../utils/finance'`
   - `MonthlyTab.jsx`: `import { fmt, formatYearMonth, shiftMonth } from '../utils/finance'`

3. `npm test` を実行して既存テストがすべてパスすることを確認する。

> **注意:** 関数のシグネチャや実装は変更しない。純粋な抽出のみ。

#### 検証チェックリスト

- [ ] `npm test` が全件パスすること
- [ ] アプリを起動し各タブで金額表示が正常なこと
- [ ] ボーナス月のハイライトが正常に機能すること
- [ ] 月ナビゲーションが正常に動作すること

---

### TASK-06: フォーム送信ローディング状態の追加

| 項目 | 内容 |
|------|------|
| 優先度 | 🟡 中 |
| 工数 | S（半日以内） |
| 依存 | なし |

#### 問題

`AccountsTab.jsx`、`FixedPaymentsTab.jsx`、`CreditCardsTab.jsx` の `handleSubmit` は非同期処理を呼ぶが、実行中に送信ボタンが無効化されない。ユーザーが保存ボタンを連打すると、同じデータが複数回作成される可能性がある。保存中の視覚的なフィードバックもない。

#### 対象ファイル

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `frontend/src/components/AccountsTab.jsx` | 99 | `handleSubmit` にローディングガードなし |
| `frontend/src/components/FixedPaymentsTab.jsx` | 149 | 同様 |
| `frontend/src/components/CreditCardsTab.jsx` | 106 | 同様 |
| `frontend/src/components/ui/Modal.jsx` | 110 | 送信ボタンに `disabled` props未使用 |

#### アプローチ

1. 3つのタブコンポーネントに `const [submitting, setSubmitting] = useState(false)` を追加する。

2. 各 `handleSubmit` を以下のパターンに修正する。

   ```jsx
   const handleSubmit = async () => {
     if (submitting) return;
     setSubmitting(true);
     try {
       if (modalMode === 'add') {
         await addAccount({ name: form.name, balance: Number(form.balance) });
       } else {
         await editAccount(editTarget.id, { name: form.name, balance: Number(form.balance) });
       }
       setModal(null); // 成功時のみモーダルを閉じる
     } catch (e) {
       // TASK-03のtoast通知と組み合わせてエラーを表示
     } finally {
       setSubmitting(false);
     }
   };
   ```

3. `Modal.jsx` に `submitting` プロパティを追加する。送信ボタンに `disabled={submitting}` を付け、ラベルを `submitting ? '保存中...' : (submitLabel || '保存')` に変更する。送信中はキャンセルボタンと閉じるボタンも無効化する。

4. `handleDelete` にも同様に `deleting` 状態を追加し、二重削除を防ぐ。

#### 検証チェックリスト

- [ ] 追加モーダルで保存ボタンを連打してもデータが1件のみ作成されること
- [ ] 送信中にボタンが「保存中...」と表示され、クリックできないこと
- [ ] 完了後にボタンが「保存」に戻り、再度クリックできること
- [ ] 失敗時にモーダルが開いたままでボタンが再有効化されること

---

### TASK-07: テストカバレッジ強化 — APIエンドポイント

| 項目 | 内容 |
|------|------|
| 優先度 | 🟡 中 |
| 工数 | M（1〜2日） |
| 依存 | TASK-01, TASK-02 |

#### 問題

APIテストは `api/src/__tests__/auth.test.js` のみで、4つのエンドポイントハンドラのテストが存在しません。バリデーション（TASK-01）・エラーハンドリング（TASK-02）・カスケード削除ロジック・ODataフィルタ生成にテストがなく、リグレッションが検出できません。

#### 対象ファイル

| ファイル | 状況 |
|---------|------|
| `api/src/__tests__/auth.test.js` | ✅ テスト完備。構造のリファレンスとして使用 |
| `api/src/functions/accounts.js` | ❌ 4ハンドラ、テストなし |
| `api/src/functions/fixedPayments.js` | ❌ 4ハンドラ、テストなし |
| `api/src/functions/creditCards.js` | ❌ 4ハンドラ、テストなし |
| `api/src/functions/monthlyRecords.js` | ❌ 2ハンドラ、テストなし |

#### アプローチ

1. `auth.test.js` のパターンを理解する。リクエストオブジェクトは `headers.get` メソッドを持つプレーンオブジェクトで模擬する。Azure Functions SDKのモックは不要。

2. 各ハンドラファイルに対応するテストファイルを作成する: `accounts.test.js`、`fixedPayments.test.js`、`creditCards.test.js`、`monthlyRecords.test.js`。

3. 各テストで `../shared/tableClient` の `getTableClient` を `jest.mock()` でモックする。モックは `listEntities`（非同期イテラブルを返す）、`createEntity`、`updateEntity`、`deleteEntity`、`upsertEntity` を `jest.fn()` として返す。

4. カバーすべきテストケース:
   - GETハンドラ: 返却された `jsonBody` の形状、`listEntities` がユーザーの `userId` を含むフィルタで呼ばれること
   - POSTハンドラ: `createEntity` が正しいエンティティ形状で呼ばれること、レスポンスが201と `id` フィールドを含むこと
   - PUTハンドラ: `updateEntity` が `"Merge"` モードで呼ばれること
   - `accounts.js` のDELETEハンドラ: カスケード — `fpClient.listEntities` と `ccClient.listEntities` が呼ばれ、各エンティティに `updateEntity` が呼ばれること
   - バリデーション（TASK-01マージ後）: 必須フィールドがない場合に400が返ること
   - エラーハンドリング（TASK-02マージ後）: `createEntity` がthrowしたとき500が返り `context.error` が呼ばれること

#### 検証チェックリスト

- [ ] 全テストファイルが `npm test` でパスすること
- [ ] 各エンドポイントで正常系・異常系の両方がカバーされていること
- [ ] カスケード削除のロジックがテストで確認されていること
- [ ] 未認証リクエストのテストがあること（403を返すこと）

---

### TASK-08: テストカバレッジ強化 — フロントエンド

| 項目 | 内容 |
|------|------|
| 優先度 | 🟡 中 |
| 工数 | M（1〜2日） |
| 依存 | TASK-03 |

#### 問題

フロントエンドのテストは `Dashboard.jsx`・`Modal.jsx`・UIコンポーネントの一部のみカバーしています。`AccountsTab.jsx`・`FixedPaymentsTab.jsx`・`CreditCardsTab.jsx`・`MonthlyTab.jsx`・`useFinanceData.js`・`client.js` のテストがありません。`vitest.config.js` にカバレッジ設定がないため、カバレッジ率が不明です。

#### 対象ファイル

| ファイル | 状況 |
|---------|------|
| `frontend/vitest.config.js` | カバレッジ設定なし |
| `frontend/src/components/AccountsTab.jsx` | テストなし |
| `frontend/src/components/FixedPaymentsTab.jsx` | テストなし |
| `frontend/src/components/CreditCardsTab.jsx` | テストなし |
| `frontend/src/components/MonthlyTab.jsx` | テストなし |
| `frontend/src/hooks/useFinanceData.js` | テストなし |
| `frontend/src/api/client.js` | テストなし |

#### アプローチ

1. `frontend/vitest.config.js` にカバレッジ設定を追加する。

   ```javascript
   coverage: {
     provider: 'v8',
     reporter: ['text', 'lcov'],
     exclude: ['src/test/**'],
   }
   ```

   `frontend/package.json` の scripts に `"test:coverage": "vitest run --coverage"` を追加する。

2. `AccountsTab.test.jsx` を作成する。`data` プロパティにvitest `vi.fn()` でモックした各ミューテーションを渡す。テストケース: アカウントが空のときEmptyStateが表示される、追加ボタンクリックでモーダルが開く、フォーム送信で `addAccount` が正しいペイロードで呼ばれる、削除ボタンが `window.confirm` を呼び `removeAccount` を実行する。

3. 同様の構造で `FixedPaymentsTab.test.jsx` と `CreditCardsTab.test.jsx` を作成する。

4. `MonthlyTab.test.jsx` を作成する。`vi.useFakeTimers()` でデバウンスを制御する。テストケース: 残高入力の変更がローカル状態に反映される、デバウンス後に `saveMonthly` が呼ばれる、月ナビゲーションボタンが正しくシフトした `yearMonth` で `setYearMonth` を呼ぶ。

5. `useFinanceData.test.js` を `@testing-library/react` の `renderHook` で作成する。`../api/client` の全関数をモックする。テストケース: 初期ロードで4つのAPI関数が呼ばれる、`addAccount` がaccounts配列を更新する、`removeAccount` が `fixedPayments` 内の `accountId` 参照もクリアする、`getAccounts` がリジェクトするとエラー状態がセットされる。

#### 検証チェックリスト

- [ ] `npm run test:coverage` が実行できること
- [ ] 新規作成した全テストがパスすること
- [ ] 既存テストが引き続きパスすること
- [ ] カバレッジレポートが `frontend/coverage/` に出力されること

---

### TASK-09: DevOps / CI改善

| 項目 | 内容 |
|------|------|
| 優先度 | 🟡 中 |
| 工数 | S（半日以内） |
| 依存 | なし |

#### 問題

CI/CDパイプラインに `npm audit` によるセキュリティスキャンがなく、既知の脆弱性がある依存パッケージがデプロイされる可能性があります。Dependabotが設定されていないため、パッケージ更新の自動検知がありません。カバレッジレポートの収集もなく、カバレッジ低下が検出できません。本番へのデプロイ前にステージング検証がありません。

#### 対象ファイル

| ファイル | 内容 |
|---------|------|
| `.github/workflows/ci-cd.yml` | セキュリティスキャン・カバレッジ収集なし |
| `.github/dependabot.yml` | 存在しない |

#### アプローチ

1. `ci-cd.yml` の `build-test-frontend` ジョブの `npm ci` 後に追加する。

   ```yaml
   - name: Security audit (frontend)
     run: npm audit --audit-level=high
   ```

   `test-api` ジョブにも同様に追加する。

2. フロントエンドジョブの `npm test` を `npm run test:coverage` に置き換え（TASK-08と合わせて）、以下のArtifactアップロードを追加する。

   ```yaml
   - name: Upload coverage
     uses: actions/upload-artifact@v4
     with:
       name: frontend-coverage
       path: frontend/coverage/lcov.info
       retention-days: 7
   ```

3. `.github/dependabot.yml` を新規作成する。

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

4. `.github/pull_request_template.md` を新規作成し、以下を記載する: テスト実施確認・CIパス確認・本番影響範囲の記述欄。

5. （任意）`staging` ブランチへのpushで `deploy-staging` ジョブが実行されるように `ci-cd.yml` を拡張する（Azure SWAの2つ目のインスタンスとシークレットが必要なためインフラチームと調整）。

#### 検証チェックリスト

- [ ] PRを作成してCIで `npm audit` ステップが実行されること
- [ ] カバレッジレポートがArtifactとしてダウンロードできること
- [ ] Dependabotの設定が反映され、週次でPRが作成されること

---

### TASK-10: モニタリング・ロギング導入

| 項目 | 内容 |
|------|------|
| 優先度 | 🟡 中 |
| 工数 | M（1〜2日） |
| 依存 | なし |

#### 問題

APIハンドラに構造化ログがなく、本番エラー発生時の追跡手段がありません。Azure Functionsの `context` オブジェクトは全ハンドラで第2引数として利用可能ですが、一切使用されていません。Application Insightsの設定もありません。

#### 対象ファイル

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `api/src/functions/accounts.js` | 12, 40, 75, 102 | `context` 引数が未使用 |
| `api/src/functions/fixedPayments.js` | 全ハンドラ | 同様 |
| `api/src/functions/creditCards.js` | 全ハンドラ | 同様 |
| `api/src/functions/monthlyRecords.js` | 全ハンドラ | 同様 |
| `api/host.json` | — | Application Insights設定なし |

#### アプローチ

1. `api/src/shared/logger.js` を新規作成する。

   ```javascript
   // api/src/shared/logger.js
   function createLogger(context, userId) {
     const base = { userId, timestamp: new Date().toISOString() };
     return {
       info: (msg, extra = {}) => context.log(msg, { ...base, ...extra }),
       warn: (msg, extra = {}) => context.warn(msg, { ...base, ...extra }),
       error: (msg, extra = {}) => context.error(msg, { ...base, ...extra }),
     };
   }
   module.exports = { createLogger };
   ```

2. 各ハンドラの先頭（認証チェック後）に以下を追加する（TASK-02のtry-catchと合わせて実施）。

   ```javascript
   const logger = createLogger(context, user.userId);
   logger.info('accounts-create: start', { url: request.url });
   ```

3. `api/host.json` に接続文字列設定を追加する。

   ```json
   {
     "version": "2.0",
     "logging": {
       "applicationInsights": {
         "samplingSettings": { "isEnabled": true, "maxTelemetryItemsPerSecond": 20 }
       }
     }
   }
   ```

4. AzureポータルのFunction App → 設定 → アプリケーション設定に `APPLICATIONINSIGHTS_CONNECTION_STRING` を追加する。リポジトリルートに `.env.example` を作成してキー名を文書化する（値は記載しない）。

5. （発展）フロントエンドの `ErrorBoundary.jsx`（TASK-03で作成）の `componentDidCatch` でApplication Insights JavaScriptSDKにエラーを送信する実装を検討する。

#### 検証チェックリスト

- [ ] ローカルで `func start` 実行時にターミナルに構造化ログが出力されること
- [ ] Azure PortalのApplication Insights → ライブメトリクスで通信が確認できること
- [ ] 意図的にエラーを発生させ、Application Insightsの「失敗」セクションに記録されること

---

### TASK-11: CSSアーキテクチャ整理

| 項目 | 内容 |
|------|------|
| 優先度 | 🟢 低 |
| 工数 | L（3日以上） |
| 依存 | なし |

> ⚠️ このタスクは大規模で、ほぼ全コンポーネントのスタイリングに影響します。他のPRがアクティブな期間は着手を避け、単独スプリントとして計画してください。

#### 問題

スタイリングが3つのパターンで混在しています。(1) `App.jsx:282`・`Dashboard.jsx:159` で `<style>` タグでCSS文字列をランタイムに注入、(2) 全コンポーネントでJavaScriptオブジェクトをstyle propに渡すインラインスタイル、(3) 同一の16進カラー値（`#161b24`・`#1e2530`・`#6b7585`・`#e4e8ef`・`#4f8cff`）が全ファイルに散在。ブランドカラー変更には多数のファイル修正が必要な状態です。

#### 対象ファイル

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `frontend/src/App.jsx` | 37–118 | `layoutCSS` CSS文字列 |
| `frontend/src/App.jsx` | 123–215 | `styles` インラインオブジェクト |
| `frontend/src/components/Dashboard.jsx` | 15–54 | `dashboardCSS` CSS文字列 |
| `frontend/src/components/Dashboard.jsx` | 56–96 | インラインstyleオブジェクト |
| `frontend/src/components/AccountsTab.jsx` | 10–79 | ハードコードカラーのstyleオブジェクト |
| `frontend/src/components/FixedPaymentsTab.jsx` | 21–108 | 同様 |
| `frontend/src/components/CreditCardsTab.jsx` | 7–81 | 同様 |
| `frontend/src/components/MonthlyTab.jsx` | 18–105 | 同様 |
| `frontend/src/components/ui/Modal.jsx` | 3–79 | 同様 |
| `frontend/src/components/ui/InputField.jsx` | 3–24 | 同様 |
| `frontend/src/components/ui/SelectField.jsx` | 3–25 | 同様 |
| `frontend/src/components/ui/EmptyState.jsx` | 3–22 | 同様 |

#### アプローチ

1. `frontend/src/styles/tokens.css` を新規作成する（最低リスク、最初に実施）。

   ```css
   :root {
     --color-bg-primary: #161b24;
     --color-bg-secondary: #1e2530;
     --color-text-primary: #e4e8ef;
     --color-text-muted: #6b7585;
     --color-accent: #4f8cff;
     --color-danger: #f87171;
     --color-success: #6ee7a0;
     --radius-md: 8px;
     --radius-lg: 12px;
   }
   ```

2. `frontend/src/main.jsx` に `import './styles/tokens.css'` を追加する。

3. `App.jsx` の `layoutCSS` 文字列を `frontend/src/styles/layout.css` に移動する。CSS変数を使ってハードコードカラーを置き換える。

4. `Dashboard.jsx` の `dashboardCSS` 文字列を `frontend/src/styles/dashboard.css` に移動する。

5. インラインstyleオブジェクトはCSSモジュールに段階的に移行する。Viteは設定変更なしでCSS Modulesをサポートする（ファイル名を `*.module.css` にするだけ）。

   移行優先順位: UIコンポーネント（`ui/`配下）→ タブコンポーネント → `App.jsx`

#### 検証チェックリスト

- [ ] 全コンポーネントの表示が変更前後で同一であること
- [ ] CSS変数を変更するだけでテーマカラーが全体に反映されること
- [ ] ブラウザコンソールにCSSエラーが出ないこと
- [ ] 既存テストが引き続きパスすること

---

### TASK-12: アクセシビリティ対応

| 項目 | 内容 |
|------|------|
| 優先度 | 🟡 中 |
| 工数 | M（1〜2日） |
| 依存 | なし |

#### 問題

インタラクティブな要素にARIA属性が欠けています。`Modal.jsx` はdivオーバーレイで `role="dialog"`・`aria-modal`・`aria-labelledby` がありません。`App.jsx:286` のハンバーガーボタンは "☰" を表示するが `aria-label` がありません。`Modal.jsx:95` の閉じるボタン "✕" にも `aria-label` がありません。`App.jsx:241-249` のナビゲーション項目は `<div onClick>` で実装されており、キーボードフォーカスが当たりません。

#### 対象ファイル

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `frontend/src/components/ui/Modal.jsx` | 91–92 | `role="dialog"`・`aria-modal`・`aria-labelledby` なし |
| `frontend/src/components/ui/Modal.jsx` | 95 | 閉じるボタンに `aria-label` なし |
| `frontend/src/App.jsx` | 286 | ハンバーガーボタンに `aria-label` なし |
| `frontend/src/App.jsx` | 255–263 | 月ナビゲーションボタンに `aria-label` なし |
| `frontend/src/App.jsx` | 239 | `<nav>` に `aria-label` なし |
| `frontend/src/App.jsx` | 241–249 | ナビ項目が `<div>` で `<button>` でない |
| `frontend/src/components/MonthlyTab.jsx` | 165–176 | 月ナビボタンに `aria-label` なし |
| `frontend/src/components/ui/InputField.jsx` | 全体 | `<label>` と `<input>` の `htmlFor`/`id` 対応なし |

#### アプローチ

1. `Modal.jsx` に以下を追加する。

   ```jsx
   <div
     role="dialog"
     aria-modal="true"
     aria-labelledby="modal-title"
   >
     <span id="modal-title">{title}</span>
     <button aria-label="閉じる" onClick={onClose}>✕</button>
   ```

2. `App.jsx` を修正する。

   ```jsx
   <nav aria-label="ナビゲーション">
     {/* divをbuttonに変更 */}
     <button onClick={() => setTab('dashboard')} style={{ /* ... */ }}>
       ダッシュボード
     </button>
   </nav>

   <button aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
     aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
     ☰
   </button>

   <button aria-label="前の月" onClick={() => setYearMonth(shiftMonth(yearMonth, -1))}>◀</button>
   <button aria-label="次の月" onClick={() => setYearMonth(shiftMonth(yearMonth, 1))}>▶</button>
   ```

   `<button>` のデフォルトブラウザスタイルをリセットするCSSが必要（`background: none; border: none;` 等）。

3. `MonthlyTab.jsx` の月ナビゲーションボタンにも同様の `aria-label` を追加する。

4. `InputField.jsx` でReact 18の `useId()` を使い、各inputに一意のIDを付与する。

   ```jsx
   const id = useId();
   return (
     <>
       <label htmlFor={id}>{label}</label>
       <input id={id} {...props} />
     </>
   );
   ```

5. Lighthouseまたはaxeでカラーコントラストを確認する。`#6b7585` テキストと `#161b24` 背景のコントラスト比をWCAG AA基準（4.5:1）と照合し、不足する場合は色を調整する。

#### 検証チェックリスト

- [ ] Lighthouseのアクセシビリティスコアが80以上であること
- [ ] Tabキーのみでモーダルを開き・操作し・閉じられること
- [ ] スクリーンリーダーでモーダルタイトルが読み上げられること
- [ ] ナビゲーション項目がキーボードでフォーカスされること
- [ ] InputFieldの `<label>` クリックで対応する `<input>` がフォーカスされること

---

### TASK-13: パフォーマンス・キャッシング改善

| 項目 | 内容 |
|------|------|
| 優先度 | 🟢 低 |
| 工数 | M（1〜2日） |
| 依存 | TASK-03 |

#### 問題

`useFinanceData.js` は `yearMonth` が変わるたびに `loadAll()` を実行し、口座・固定支払い・クレジットカードのデータも毎回フルフェッチします。これらは月が変わっても変化しない静的データです。過去に閲覧した月に戻ってもキャッシュがないため再リクエストが発生します。データ件数が増えた場合にAPIにページネーションがなく、全件取得となります。

#### 対象ファイル

| ファイル | 行番号 | 内容 |
|---------|--------|------|
| `frontend/src/hooks/useFinanceData.js` | 14–32 | `loadAll` が静的データも毎回フェッチ |
| `frontend/src/hooks/useFinanceData.js` | 34–36 | `useEffect` が `yearMonth` 変更で `loadAll` を再実行 |
| `api/src/functions/accounts.js` | 18–31 | `listEntities` にページネーションなし |
| `api/src/functions/fixedPayments.js` | 18–35 | 同様 |
| `api/src/functions/creditCards.js` | 18–32 | 同様 |

#### アプローチ

1. `loadAll` を2つの関数に分割する。

   ```javascript
   // 静的データ（初回のみ）
   useEffect(() => {
     loadStatic(); // accounts, fixedPayments, creditCards
   }, []);

   // 月次データ（月変更時）
   useEffect(() => {
     loadMonthly(yearMonth); // monthlyRecords のみ
   }, [yearMonth]);
   ```

2. 月次データのクライアントサイドキャッシュを `useRef` で実装する。

   ```javascript
   const monthlyCache = useRef({});

   async function loadMonthly(ym) {
     if (monthlyCache.current[ym]) {
       setMonthlyRecords(monthlyCache.current[ym]);
       return;
     }
     const data = await api.getMonthlyRecords(ym);
     monthlyCache.current[ym] = data;
     setMonthlyRecords(data);
   }

   // 保存成功時にキャッシュを無効化
   async function saveMonthly(ym, records) {
     await api.saveMonthlyRecords(ym, records);
     delete monthlyCache.current[ym];
   }
   ```

3. （ライブラリ採用案）`swr` の導入を検討する。手動キャッシュロジックを `useSWR` 呼び出しに置き換えることで、自動重複排除・フォーカス時再検証・stale-while-revalidate が得られる。現在の `useFinanceData` フックの大幅な書き換えが必要なため、専用PRとして計画する。

4. ページネーションの追加（APIとフロントエンドの両方に変更が必要）: `listEntities` の `byPage()` とcontinuationTokenを利用する。フロントエンドには「さらに読み込む」ボタンまたは無限スクロールを追加する。

#### 検証チェックリスト

- [ ] 月を切り替えてもマスターデータのAPIリクエストが発生しないこと（Networkタブで確認）
- [ ] 一度閲覧した月に戻ったとき、月次データのAPIリクエストが発生しないこと
- [ ] 月次データの保存後に同じ月を開くとAPIリクエストが発生すること（キャッシュ無効化の確認）
- [ ] 月次データが正しく切り替わること

---

## 付録：プロジェクト概要

### アーキテクチャ

```
フロントエンド (React 18 + Vite)
  └── frontend/src/
      ├── App.jsx                  ← 全体レイアウト・月ナビ・タブ切替
      ├── api/client.js            ← HTTP通信クライアント
      ├── hooks/
      │   └── useFinanceData.js    ← データ取得・状態管理の中心
      └── components/
          ├── Dashboard.jsx
          ├── AccountsTab.jsx
          ├── FixedPaymentsTab.jsx
          ├── CreditCardsTab.jsx
          ├── MonthlyTab.jsx
          └── ui/                  ← 再利用コンポーネント
              ├── Modal.jsx
              ├── InputField.jsx
              ├── SelectField.jsx
              └── EmptyState.jsx

バックエンド (Azure Functions v4 + Azure Table Storage)
  └── api/src/
      ├── functions/
      │   ├── accounts.js         ← 口座CRUD（削除カスケード含む）
      │   ├── fixedPayments.js    ← 固定支払CRUD
      │   ├── creditCards.js      ← クレジットカードCRUD
      │   └── monthlyRecords.js   ← 月次記録GET/PUT
      └── shared/
          ├── auth.js             ← x-ms-client-principal デコード
          └── tableClient.js      ← Azure Table Storage接続

CI/CD: GitHub Actions → Azure Static Web Apps
認証: Azure SWAのGitHub OAuth（エッジで強制）
```

### ローカル開発環境

```bash
# フロントエンド
cd frontend && npm install && npm run dev   # port 5173

# バックエンド（Azure Functions Core Tools が必要）
cd api && npm install && npm run start      # port 7071

# 認証シミュレーター（Azure Static Web Apps CLI が必要）
npx @azure/static-web-apps-cli start --api-devserver-url http://localhost:7071
# port 4280
```

---

## 用語集

| 用語 | 説明 |
|------|------|
| **Azure Static Web Apps (SWA)** | ホスティングプラットフォーム。認証ルーティング・`staticwebapp.config.json` のエッジルール適用・`frontend/dist` と `api/` の同時デプロイを担う |
| **Azure Table Storage** | データベースとして使用するNoSQLキーバリューストア。レコードは `PartitionKey`（= `userId`）と `RowKey`（= レコードID）で識別される |
| **ODataフィルタ** | `listEntities` が使用するクエリ言語。フィルタ文字列にユーザー入力を文字列補間することはInjectionリスクになる |
| **`x-ms-client-principal`** | SWAが認証済みユーザーのすべてのAPIリクエストにインジェクトするbase64エンコードのJWTヘッダー。`auth.js` でデコードされる |
| **`authLevel: "anonymous"`** | Azure FunctionsのキーベースのAuthを無効化する設定。エンドポイントが公開という意味ではない。SWAがエッジで認証を強制するため、未認証リクエストはこの設定に関係なく関数に到達しない |
| **`yearMonth`** | アプリ全体で月次レコードのキーとして使用する `YYYY-MM` 形式の文字列 |
