# ラズパイでのローカル稼働

Azure Static Web Apps (SPA + Functions + Table Storage) で動いているこのアプリを、
ラズパイ 1 台・Node プロセス 1 つで動かすための手順。

Azure 側はそのまま残せる。切り替えは環境変数 `STORE_BACKEND` だけで、
移行スクリプトは何度でも再実行できるので、ローカルが安定するまで併存させてよい。

## 構成

```
                    ラズパイ (Node 1 プロセス, :8080)
  ブラウザ ──────▶  api/src/local/server.js
                      ├─ /api/*   → Azure Functions のハンドラをそのまま実行
                      │             (api/src/local/functionsAdapter.js が Express にマウント)
                      ├─ /.auth/* → 固定シングルユーザーを返す (EasyAuth の代わり)
                      └─ /*       → frontend/dist の静的配信 + SPA フォールバック
                                          │
                                          ▼
                              SQLite (/opt/kakei/data/kakei.db)
```

Azure 稼働時との違いは次の 3 点だけで、アプリのハンドラ・画面コードは共通のまま。

| | Azure | ラズパイ |
|---|---|---|
| データ | Azure Table Storage | SQLite (`STORE_BACKEND=sqlite`) |
| 認証 | SWA の GitHub OAuth + `owner` ロール | 固定シングルユーザー (`LOCAL_USER_ID`) |
| 実行 | Functions ランタイム + SWA ホスティング | Express アダプタ + systemd |

**認証は行わない。LAN 内からのみアクセスできる前提で運用すること。**
ポート開放・外部公開はしないこと。

---

## 1. 事前準備

- ラズパイ (Pi 4 / Pi 5 推奨)、64bit OS
- Node.js 20 LTS 以上
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  node --version   # v20 以上
  ```
- タイムゾーン
  ```bash
  sudo timedatectl set-timezone Asia/Tokyo
  ```

`better-sqlite3` は linux-arm64 のビルド済みバイナリが配布されるので、通常はコンパイル不要。
もしビルドが走る環境なら `sudo apt-get install -y build-essential python3` を先に入れておく。

## 2. 配置とビルド

```bash
sudo mkdir -p /opt/kakei /opt/kakei/data
sudo chown -R pi:pi /opt/kakei
git clone https://github.com/t-develo/personal-finance-management-app.git /opt/kakei
cd /opt/kakei

# API
cd api && npm ci && cd ..

# フロントエンド (Pi 4/5 なら 1〜2 分程度)
cd frontend && npm ci && npm run build && cd ..
```

> Pi Zero など非力な機種では、手元の PC で `npm run build` して
> `rsync -av frontend/dist/ pi@raspberrypi:/opt/kakei/frontend/dist/` で転送してもよい。

フォントはバンドルに同梱済みなので、稼働中にインターネット接続は不要。

## 3. 設定

```bash
cp deploy/env.example /opt/kakei/.env
nano /opt/kakei/.env      # LOCAL_USER_ID を必ず設定する
```

`LOCAL_USER_ID` は **Azure 稼働時の `PartitionKey` と同じ値**にする。
確認方法はどちらでもよい:

- Azure 版にログインした状態でブラウザから `https://<アプリ>/.auth/me` を開き `userId` を見る
- 次項の `export-azure.js` の実行ログに、検出された userId が表示される

## 4. データ移行

Azure のアクセスキー (ポータル > ストレージアカウント > アクセスキー) を用意する。

```bash
cd /opt/kakei/api

# 4-1. Azure から JSON にエクスポート → /opt/kakei/data/export/*.json
STORAGE_ACCOUNT_NAME=xxxxx STORAGE_ACCOUNT_KEY=yyyyy \
  npm run migrate:export

# 4-2. JSON を SQLite に取り込む (冪等。何度実行してもよい)
npm run migrate:import -- --db /opt/kakei/data/kakei.db

# 4-3. Azure と SQLite を突き合わせて差分を確認する
STORAGE_ACCOUNT_NAME=xxxxx STORAGE_ACCOUNT_KEY=yyyyy \
  npm run migrate:verify -- --db /opt/kakei/data/kakei.db
```

`migrate:verify` が「差分なし」で終了 (終了コード 0) すれば移行完了。

userId を別の値に付け替えたい場合のみ、`migrate:import` と `migrate:verify` の
両方に `--user-id <新しいID>` を付ける (通常は不要)。

## 5. 常駐化

```bash
sudo cp /opt/kakei/deploy/kakei-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kakei-app
systemctl status kakei-app
journalctl -u kakei-app -f
```

LAN 内の PC / スマホから `http://<ラズパイのIP>:8080` を開く。
ルーターで固定 IP を割り当てるか、mDNS (`http://raspberrypi.local:8080`) を使うと楽。

## 6. バックアップ

アプリを止めずに整合性のあるコピーを作り、検証してから世代を切り詰める。

```bash
cd /opt/kakei/api
node scripts/backup-sqlite.js --db /opt/kakei/data/kakei.db
```

cron に登録する (毎日 3:00、30 世代保持):

```cron
0 3 * * * cd /opt/kakei/api && /usr/bin/node scripts/backup-sqlite.js --db /opt/kakei/data/kakei.db >> /var/log/kakei-backup.log 2>&1
```

SD カードの故障に備え、バックアップ先は別デバイスにするのが望ましい。
可能なら DB 自体も USB SSD 上に置き、`SQLITE_PATH` をそこに向ける。

```cron
30 3 * * * rsync -a /opt/kakei/data/backups/ /mnt/usb/kakei-backups/
```

---

## 動作確認チェックリスト

移行直後に一通り確認する。

1. `systemctl status kakei-app` が `active (running)`
2. `curl -s localhost:8080/.auth/me` が設定した `userId` を返す
3. `curl -s localhost:8080/api/accounts` が **Azure 版と同じ口座一覧**を返す
4. ブラウザで開き、口座・クレジットカード・固定費・当月の月次記録が Azure 版と一致する
5. 口座を 1 件追加 → 再読み込みしても残っている
6. 口座を削除 → その口座を参照していた固定費・クレカの口座欄が空になる
7. `sudo reboot` → 自動起動し、データが残っている
8. `node scripts/backup-sqlite.js` が成功し、`backup ok` が出る

## Azure の停止 (カットオーバー)

ラズパイ稼働が安定したら:

1. Azure 版で最後の更新を済ませる
2. `migrate:export` → `migrate:import` → `migrate:verify` をもう一度実行して差分ゼロを確認
3. Azure Static Web App とストレージアカウントを停止 / 削除
4. GitHub の `AZURE_STATIC_WEB_APPS_API_TOKEN` シークレットを削除し、
   `.github/workflows/ci-cd.yml` の `deploy` ジョブを外す

停止するまでは、Azure 側は `STORE_BACKEND` 未設定 (= `azure`) のまま従来どおり動く。

---

## 開発時 (手元の PC)

SWA CLI も Azure Functions Core Tools も不要。2 プロセスで動く。

```bash
# ターミナル 1: API + 認証エミュレーション (:8080)
cd api
STORE_BACKEND=sqlite SQLITE_PATH=./data/dev.db LOCAL_USER_ID=dev-user npm run start:local

# ターミナル 2: Vite 開発サーバー (:5173、/api と /.auth を :8080 にプロキシ)
cd frontend && npm run dev
```

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| 画面は出るがデータが空 | `LOCAL_USER_ID` が Azure の `PartitionKey` と違う。`.env` を直して `systemctl restart kakei-app` |
| `Error: Cannot find module 'better-sqlite3'` | `cd /opt/kakei/api && npm ci` を実行。ビルドが必要なら `build-essential` `python3` を入れる |
| `frontend dist が見つかりません` の警告 | `cd frontend && npm run build`、または `.env` の `FRONTEND_DIST` を確認 |
| API が 500 を返す | `journalctl -u kakei-app -n 50` でスタックトレースを確認 |
| `SQLITE_BUSY` | 移行スクリプトとサーバーが同時に書いている。`systemctl stop kakei-app` してから移行する |
| 日時が UTC でずれる | `.env` の `TZ=Asia/Tokyo` と `sudo timedatectl set-timezone Asia/Tokyo` の両方を設定する |
