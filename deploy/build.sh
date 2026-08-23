#!/usr/bin/env bash
#
# 依存のインストールとフロントエンドのビルド。
# install.sh (初回導入) と update.sh (自動アップデート) の両方から呼ぶ。
#
#   deploy/build.sh [リポジトリのパス]
#
# 引数を省略した場合はこのスクリプトの 1 つ上のディレクトリを使う。

set -euo pipefail

APP_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

log() { echo "[build] $*"; }

log "api の依存をインストール"
# jest は devDependencies だが、実機でもテストを回せるように --omit=dev は付けない。
# better-sqlite3 は optionalDependencies なので、arm64 のビルド済みバイナリが
# 無い環境ではここで node-gyp のコンパイルが走る (build-essential python3 が必要)。
cd "$APP_DIR/api"
npm ci

log "frontend の依存をインストール"
cd "$APP_DIR/frontend"
npm ci

log "frontend をビルド"
npm run build

log "完了: $APP_DIR/frontend/dist"
