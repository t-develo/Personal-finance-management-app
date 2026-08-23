#!/usr/bin/env bash
#
# リポジトリを監視し、更新があれば取り込んでサービスを再起動する。
# kakei-update.timer から 15 分ごとに実行される (手動実行も同じ)。
#
#   deploy/update.sh            更新があれば適用する
#   deploy/update.sh --check    更新の有無を表示するだけ (何も変更しない)
#   deploy/update.sh --force    更新が無くても再ビルド・再起動する
#
# 更新があったときの流れ:
#   ff 可否の確認 → DB バックアップ → git merge --ff-only → ビルド
#   → 再起動 → /healthz 確認
#
# 失敗したら途中で止まる。ビルドまでに失敗した場合、サービスは旧コードのまま
# 動き続ける。再起動後の /healthz が通らなかった場合は exit 1 で終わるので、
# systemctl --failed / journalctl -u kakei-update で気付ける。

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
LOCK_FILE="${LOCK_FILE:-$APP_DIR/data/update.lock}"
HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-30}"

# .env を読み込むと同名の変数が上書きされるので、明示的に渡された値を退避しておく
# (コマンドラインで渡した BRANCH / PORT の方を優先させるため)。
BRANCH_ARG="${BRANCH:-}"
PORT_ARG="${PORT:-}"

MODE="apply"
case "${1:-}" in
  --check) MODE="check" ;;
  --force) MODE="force" ;;
  "")      ;;
  *)       echo "不明な引数: $1 (--check / --force)" >&2; exit 2 ;;
esac

log() { echo "[update] $*"; }
die() { echo "[update] エラー: $*" >&2; exit 1; }

# systemd から起動されたときは EnvironmentFile で読み込まれているが、
# 手動実行でも同じ設定で動くように読み込んでおく。
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

# 優先順: コマンドラインで渡した値 > .env > 既定
BRANCH="${BRANCH_ARG:-${BRANCH:-main}}"
PORT="${PORT_ARG:-${PORT:-8787}}"

SYSTEMCTL="$(command -v systemctl)" || die "systemctl が見つかりません"

# --- 二重起動の防止 ----------------------------------------------------------
# タイマーと手動実行、あるいは前回の実行がまだビルド中の場合に備える。
mkdir -p "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "別の更新処理が実行中のためスキップ"
  exit 0
fi

cd "$APP_DIR"

# --- 差分の確認 --------------------------------------------------------------
git fetch --prune origin "$BRANCH" || die "git fetch に失敗しました (ネットワークを確認)"

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ] && [ "$MODE" != "force" ]; then
  log "up to date (${LOCAL_SHA:0:8})"
  exit 0
fi

if [ "$MODE" = "check" ]; then
  log "更新あり: ${LOCAL_SHA:0:8} -> ${REMOTE_SHA:0:8}"
  git --no-pager log --oneline "HEAD..origin/$BRANCH"
  exit 0
fi

log "更新を検出: ${LOCAL_SHA:0:8} -> ${REMOTE_SHA:0:8}"

# --- 1. fast-forward できるかを先に確認 --------------------------------------
# ラズパイ側で独自にコミットしていると永久に ff できない。バックアップを
# 取る前に判定しておかないと、15 分ごとに無駄なバックアップだけが増える。
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ] &&
   ! git merge-base --is-ancestor HEAD "origin/$BRANCH"; then
  die "fast-forward できません (ローカルに独自の変更があります): git -C $APP_DIR status"
fi

# --- 2. DB バックアップ ------------------------------------------------------
# 壊すかもしれない操作の前に必ず取る。取れなければ更新しない。
DB_PATH="${SQLITE_PATH:-$APP_DIR/data/kakei.db}"
if [ "${STORE_BACKEND:-azure}" = "sqlite" ] && [ -f "$DB_PATH" ]; then
  log "DB をバックアップ: $DB_PATH"
  (cd "$APP_DIR/api" && node scripts/backup-sqlite.js --db "$DB_PATH") ||
    die "DB のバックアップに失敗したため更新を中止しました"
else
  log "SQLite を使っていないか DB が未作成のためバックアップは省略"
fi

# --- 3. 取り込み -------------------------------------------------------------
# fast-forward のみ。ラズパイ側で編集していた場合は勝手に捨てずに止める。
UNITS_BEFORE="$(git rev-parse "HEAD:deploy" 2>/dev/null || echo none)"

if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  git merge --ff-only "origin/$BRANCH" ||
    die "取り込みに失敗しました (作業ツリーの変更を確認): git -C $APP_DIR status"
fi

NEW_SHA="$(git rev-parse HEAD)"
UNITS_AFTER="$(git rev-parse "HEAD:deploy" 2>/dev/null || echo none)"

# --- 4. ビルド ---------------------------------------------------------------
log "ビルド"
bash "$APP_DIR/deploy/build.sh" "$APP_DIR" ||
  die "ビルドに失敗しました (サービスは旧コードのまま稼働中)"

# --- 5. systemd の再読み込み (unit 自体が更新された場合) ---------------------
# unit は /etc/systemd/system からリポジトリ内のファイルへのシンボリックリンク
# なので、内容が変わったら daemon-reload するだけでよい。
if [ "$UNITS_BEFORE" != "$UNITS_AFTER" ]; then
  log "deploy/ に変更があったため daemon-reload"
  sudo "$SYSTEMCTL" daemon-reload || die "daemon-reload に失敗しました"
fi

# --- 6. 再起動 ---------------------------------------------------------------
log "kakei-app を再起動"
sudo "$SYSTEMCTL" restart kakei-app || die "再起動に失敗しました"

# --- 7. ヘルスチェック -------------------------------------------------------
for _ in $(seq 1 "$HEALTH_TIMEOUT_SEC"); do
  if curl -fsS --max-time 5 "http://localhost:$PORT/healthz" >/dev/null 2>&1; then
    log "updated ${LOCAL_SHA:0:8}..${NEW_SHA:0:8} ok"
    exit 0
  fi
  sleep 1
done

# ロールバックは自動では行わない。手順は deploy/README.md のトラブルシューティング参照。
echo "[update] ERROR: health check failed after update ${LOCAL_SHA:0:8}..${NEW_SHA:0:8}" >&2
echo "[update] 確認: journalctl -u kakei-app -n 50" >&2
echo "[update] 戻す: git -C $APP_DIR reset --hard $LOCAL_SHA && $APP_DIR/deploy/build.sh && sudo systemctl restart kakei-app" >&2
exit 1
