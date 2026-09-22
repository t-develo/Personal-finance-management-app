#!/usr/bin/env bash
#
# 手元 PC での開発環境セットアップ。何度実行しても壊れない。
#
#   bash deploy/setup-dev.sh
#
# 行うこと:
#   1. Node.js のバージョン確認 (20 未満は警告のみ、続行はする)
#   2. api / frontend それぞれの依存インストール (npm ci)
#   3. SQLite の保存先ディレクトリ (api/data) を作成
#   4. 開発サーバーの起動方法を表示
#
# SWA CLI や Azure Functions Core Tools は不要。API + フロントエンドの
# 2 プロセスだけで動く (詳細は deploy/README.md の「開発時 (手元の PC)」参照)。

set -euo pipefail

REQUIRED_NODE_MAJOR=20
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo "[setup-dev] $*"; }
warn() { echo "[setup-dev] 警告: $*" >&2; }
die()  { echo "[setup-dev] エラー: $*" >&2; exit 1; }

# --- 1. Node.js ---------------------------------------------------------
command -v node >/dev/null 2>&1 || die "Node.js が見つかりません。https://nodejs.org から ${REQUIRED_NODE_MAJOR} 系を導入してください"
command -v npm  >/dev/null 2>&1 || die "npm が見つかりません"

node_major="$(node --version | sed -e 's/^v//' -e 's/\..*//')"
if [ "$node_major" -lt "$REQUIRED_NODE_MAJOR" ]; then
  warn "Node.js $(node --version) を検出しましたが ${REQUIRED_NODE_MAJOR} 系を推奨します (better-sqlite3 のビルド済みバイナリが無い場合があります)"
else
  log "Node.js $(node --version) を使用"
fi

# --- 2. 依存インストール --------------------------------------------------
log "api の依存をインストール"
(cd "$APP_DIR/api" && npm ci)

log "frontend の依存をインストール"
(cd "$APP_DIR/frontend" && npm ci)

# --- 3. SQLite 保存先 ------------------------------------------------------
mkdir -p "$APP_DIR/api/data"
log "SQLite 保存先を用意: $APP_DIR/api/data"

# --- 4. 次の手順を表示 ------------------------------------------------------
cat <<EOF

セットアップ完了。開発サーバーは 2 つのターミナルで起動する。

  # ターミナル 1: API + 認証エミュレーション (:8787)
  cd api
  STORE_BACKEND=sqlite SQLITE_PATH=./data/dev.db LOCAL_USER_ID=dev-user npm run start:local

  # ターミナル 2: Vite 開発サーバー (:5173、/api と /.auth を :8787 にプロキシ)
  cd frontend && npm run dev

ブラウザで http://localhost:5173 を開く。

Azure から既存データを取り込みたい場合は先に
  cd api
  STORAGE_ACCOUNT_NAME=xxxxx STORAGE_ACCOUNT_KEY=yyyyy npm run migrate:export
  npm run migrate:import -- --db ./data/dev.db
を実行してから LOCAL_USER_ID を export ログに出た userId に合わせること。
EOF
