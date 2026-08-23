#!/usr/bin/env bash
#
# ラズパイへの導入を一括で行う。何度実行しても壊れない (再実行 = 更新も兼ねる)。
#
#   sudo bash deploy/install.sh
#
# 環境変数で上書きできる:
#   APP_USER  アプリを実行するユーザー           (既定: pi)
#   APP_DIR   配置先                             (既定: /opt/kakei)
#   REPO_URL  クローン元                         (既定: 本リポジトリ)
#   BRANCH    追従するブランチ                   (既定: main)
#   PORT      待ち受けポート                     (既定: 8787 / 既存 .env があればその値)
#   TZ_NAME   タイムゾーン                       (既定: Asia/Tokyo)
#
# 例) 8787 が埋まっているので 9000 で入れる:
#   PORT=9000 sudo bash deploy/install.sh

set -euo pipefail

APP_USER="${APP_USER:-pi}"
APP_DIR="${APP_DIR:-/opt/kakei}"
REPO_URL="${REPO_URL:-https://github.com/t-develo/personal-finance-management-app.git}"
BRANCH="${BRANCH:-main}"
TZ_NAME="${TZ_NAME:-Asia/Tokyo}"
DEFAULT_PORT=8787
REQUIRED_NODE_MAJOR=20

BOLD=$(tput bold 2>/dev/null || true)
RED=$(tput setaf 1 2>/dev/null || true)
YELLOW=$(tput setaf 3 2>/dev/null || true)
RESET=$(tput sgr0 2>/dev/null || true)

log()  { echo "${BOLD}[install]${RESET} $*"; }
warn() { echo "${YELLOW}[install] 警告: $*${RESET}" >&2; }
die()  { echo "${RED}[install] エラー: $*${RESET}" >&2; exit 1; }

# 対象ユーザーとして実行する (root 所有のファイルを $APP_DIR に作らないため)。
as_app_user() { sudo -u "$APP_USER" -H "$@"; }

# --- 0. 前提チェック ---------------------------------------------------------
[ "$(id -u)" -eq 0 ] || die "root で実行してください: sudo bash $0"

id -u "$APP_USER" >/dev/null 2>&1 ||
  die "ユーザー '$APP_USER' が存在しません。APP_USER=<実際のユーザー名> sudo bash $0 で指定してください"

for cmd in git curl systemctl; do
  command -v "$cmd" >/dev/null 2>&1 || die "$cmd が見つかりません"
done

SYSTEMCTL="$(command -v systemctl)"

# --- 1. Node.js --------------------------------------------------------------
node_major() { node --version 2>/dev/null | sed -e 's/^v//' -e 's/\..*//'; }

current_major="$(node_major)"
if [ -n "$current_major" ] && [ "$current_major" -ge "$REQUIRED_NODE_MAJOR" ]; then
  log "Node.js $(node --version) を使用"
else
  log "Node.js ${REQUIRED_NODE_MAJOR} LTS を導入 (NodeSource)"
  curl -fsSL "https://deb.nodesource.com/setup_${REQUIRED_NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
  [ "$(node_major)" -ge "$REQUIRED_NODE_MAJOR" ] ||
    die "Node.js の導入に失敗しました (現在: $(node --version 2>/dev/null || echo なし))"
fi

# --- 2. タイムゾーン ---------------------------------------------------------
if [ "$(timedatectl show -p Timezone --value 2>/dev/null || true)" != "$TZ_NAME" ]; then
  log "タイムゾーンを $TZ_NAME に設定"
  timedatectl set-timezone "$TZ_NAME" || warn "タイムゾーンの設定に失敗 (手動で設定してください)"
fi

# --- 3. 配置 -----------------------------------------------------------------
log "$APP_DIR を準備"
mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  log "既存のクローンを $BRANCH の最新に更新"
  as_app_user git -C "$APP_DIR" fetch --prune origin "$BRANCH"
  as_app_user git -C "$APP_DIR" checkout -B "$BRANCH" "origin/$BRANCH" ||
    die "$BRANCH への切り替えに失敗しました。ローカルの変更を確認してください: git -C $APP_DIR status"
else
  log "$REPO_URL を $APP_DIR にクローン"
  # git clone は空でないディレクトリには展開できないので、
  # data/ の作成はクローンの後に回す。
  as_app_user git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR" ||
    die "$APP_DIR へのクローンに失敗しました ($APP_DIR が空か確認してください)"
fi

# DB の置き場。systemd unit の ReadWritePaths もここを指している。
mkdir -p "$APP_DIR/data"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

ENV_FILE="$APP_DIR/.env"

# --- 4. ポートの決定と衝突チェック -------------------------------------------
# 既存の .env は書き換えないので、.env がある場合はそこに書かれた値が実際に
# 使われるポートになる。指定された PORT と食い違うときは黙って進まず警告する。
if [ -f "$ENV_FILE" ]; then
  env_port="$(sed -n 's/^[[:space:]]*PORT=\([0-9]\+\).*/\1/p' "$ENV_FILE" | tail -1)"
  if [ -n "${PORT:-}" ] && [ -n "$env_port" ] && [ "$PORT" != "$env_port" ]; then
    warn "既存の $ENV_FILE の PORT=$env_port を使用します (指定された PORT=$PORT は無視)。"
    warn "変更するには $ENV_FILE を編集して sudo systemctl restart kakei-app を実行してください。"
  fi
  APP_PORT="${env_port:-${PORT:-$DEFAULT_PORT}}"
else
  APP_PORT="${PORT:-$DEFAULT_PORT}"
fi

case "$APP_PORT" in
  ''|*[!0-9]*) die "PORT が数値ではありません: $APP_PORT" ;;
esac

# 実際に bind してみて判定する。ss / netstat の有無に依存しない
# (この時点で Node は導入済みなので確実に使える)。
# 終了コード 0 = 使用中、それ以外 = 空き。
port_in_use() {
  node -e '
    const net = require("net");
    const srv = net.createServer();
    srv.once("error", (err) => process.exit(err.code === "EADDRINUSE" ? 0 : 2));
    srv.once("listening", () => srv.close(() => process.exit(1)));
    srv.listen(Number(process.argv[1]), "0.0.0.0");
  ' "$1"
}

if port_in_use "$APP_PORT"; then
  # 自分自身 (再実行時に稼働中の kakei-app) なら問題ない。
  if ! "$SYSTEMCTL" is-active --quiet kakei-app 2>/dev/null; then
    die "ポート $APP_PORT は他のプロセスが使用中です。別のポートを指定してください: PORT=9000 sudo bash $0"
  fi
  log "ポート $APP_PORT は稼働中の kakei-app が使用中 (再起動して引き継ぎます)"
fi

# --- 5. .env -----------------------------------------------------------------
# 既存の .env は絶対に上書きしない (稼働中の設定を再実行で壊さないため)。
if [ -f "$ENV_FILE" ]; then
  log ".env は既存のものを使用 (PORT=$APP_PORT)"
else
  log ".env を作成 (PORT=$APP_PORT)"
  cp "$APP_DIR/deploy/env.example" "$ENV_FILE"
  sed -i "s|^PORT=.*|PORT=$APP_PORT|" "$ENV_FILE"
  sed -i "s|^SQLITE_PATH=.*|SQLITE_PATH=$APP_DIR/data/kakei.db|" "$ENV_FILE"
  sed -i "s|^FRONTEND_DIST=.*|FRONTEND_DIST=$APP_DIR/frontend/dist|" "$ENV_FILE"
fi
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

# --- 6. ビルド ---------------------------------------------------------------
log "依存のインストールとビルド (Pi 4/5 で 1〜2 分)"
as_app_user bash "$APP_DIR/deploy/build.sh" "$APP_DIR"

# --- 7. sudoers (update.sh がサービスを再起動するため) -----------------------
log "sudoers を設置 (/etc/sudoers.d/kakei-updater)"
SUDOERS_TMP="$(mktemp)"
trap 'rm -f "$SUDOERS_TMP"' EXIT
sed -e "s|@APP_USER@|$APP_USER|g" -e "s|@SYSTEMCTL@|$SYSTEMCTL|g" \
  "$APP_DIR/deploy/kakei-updater.sudoers" > "$SUDOERS_TMP"
visudo -cqf "$SUDOERS_TMP" || die "sudoers の構文検証に失敗しました"
install -m 0440 -o root -g root "$SUDOERS_TMP" /etc/sudoers.d/kakei-updater

# --- 8. systemd --------------------------------------------------------------
# unit はリポジトリ内のファイルを直接 enable する (= /etc/systemd/system への
# シンボリックリンク)。こうしておくと、自動アップデートで unit が変わっても
# daemon-reload だけで反映され、コピーし直す仕組みが要らない。
log "systemd に登録"
"$SYSTEMCTL" daemon-reload
"$SYSTEMCTL" enable "$APP_DIR/deploy/kakei-app.service"
# kakei-update.service は timer からのみ起動するので enable はしない。
# ただし timer の Unit= から参照できるよう、link で systemd に認識させる。
[ -L /etc/systemd/system/kakei-update.service ] ||
  "$SYSTEMCTL" link "$APP_DIR/deploy/kakei-update.service"
"$SYSTEMCTL" enable "$APP_DIR/deploy/kakei-update.timer"
"$SYSTEMCTL" daemon-reload
"$SYSTEMCTL" restart kakei-app
"$SYSTEMCTL" restart kakei-update.timer

# --- 9. 確認 -----------------------------------------------------------------
log "起動を確認"
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 "http://localhost:$APP_PORT/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if curl -fsS --max-time 2 "http://localhost:$APP_PORT/healthz" >/dev/null 2>&1; then
  log "起動しました"
else
  warn "$APP_PORT で応答がありません。journalctl -u kakei-app -n 50 を確認してください"
fi

IP_ADDR="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "${BOLD}=== 導入完了 ===${RESET}"
echo "  アクセス   : http://${IP_ADDR:-<ラズパイのIP>}:$APP_PORT"
echo "  死活確認   : curl -s localhost:$APP_PORT/healthz"
echo "  サービス   : systemctl status kakei-app"
echo "  自動更新   : systemctl list-timers kakei-update.timer  (${BRANCH} を 15 分ごとに確認)"
echo "  ログ       : journalctl -u kakei-app -f"
echo

if grep -q '^LOCAL_USER_ID=CHANGE_ME' "$ENV_FILE"; then
  echo "${RED}${BOLD}要対応:${RESET} ${RED}$ENV_FILE の LOCAL_USER_ID がまだ CHANGE_ME です。${RESET}"
  echo "  Azure 稼働時の PartitionKey と同じ値に設定してから再起動してください:"
  echo "    sudo nano $ENV_FILE"
  echo "    sudo systemctl restart kakei-app"
  echo "  Azure からのデータ移行手順は deploy/README.md の「データ移行」を参照。"
  echo
fi
