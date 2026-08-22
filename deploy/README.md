# ラズパイでのローカル稼働

Azure Static Web Apps (SPA + Functions + Table Storage) で動いているこのアプリを、
ラズパイ 1 台・Node プロセス 1 つで動かすための手順。

Azure 側はそのまま残せる。切り替えは環境変数 `STORE_BACKEND` だけで、
移行スクリプトは何度でも再実行できるので、ローカルが安定するまで併存させてよい。

## 構成

```
                    ラズパイ (Node 1 プロセス, :8787)
  ブラウザ ──────▶  api/src/local/server.js
                      ├─ /api/*    → Azure Functions のハンドラをそのまま実行
                      │              (api/src/local/functionsAdapter.js が Express にマウント)
                      ├─ /.auth/*  → 固定シングルユーザーを返す (EasyAuth の代わり)
                      ├─ /healthz  → 死活確認 + 稼働中の commit
                      └─ /*        → frontend/dist の静的配信 + SPA フォールバック
                                          │
                                          ▼
                              SQLite (/opt/kakei/data/kakei.db)

  systemd
    ├─ kakei-app.service     … 上のプロセス。電源投入時に自動起動、落ちたら再起動
    └─ kakei-update.timer    … 15 分ごとに GitHub を確認し、更新があれば取り込む
         └─ kakei-update.service → deploy/update.sh
```

Azure 稼働時との違いは次の 3 点だけで、アプリのハンドラ・画面コードは共通のまま。

| | Azure | ラズパイ |
|---|---|---|
| データ | Azure Table Storage | SQLite (`STORE_BACKEND=sqlite`) |
| 認証 | SWA の GitHub OAuth + `owner` ロール | 固定シングルユーザー (`LOCAL_USER_ID`) |
| 実行 | Functions ランタイム + SWA ホスティング | Express アダプタ + systemd |

**認証は行わない。LAN 内からのみアクセスできる前提で運用すること。**
ポート開放・外部公開はしないこと。更新の取り込みもラズパイ側からの
ポーリングで行うので、外から入ってくる口は一切開けない。

---

## 1. 事前準備

- ラズパイ (Pi 4 / Pi 5 推奨)、64bit OS
- `git` が入っていること (`sudo apt-get install -y git`)

Node.js とタイムゾーンはインストーラが面倒を見るので、事前導入は不要。

`better-sqlite3` は linux-arm64 のビルド済みバイナリが配布されるので、通常はコンパイル不要。
もしビルドが走る環境なら `sudo apt-get install -y build-essential python3` を先に入れておく。

## 2. インストール

```bash
git clone https://github.com/t-develo/personal-finance-management-app.git /tmp/kakei-setup
sudo bash /tmp/kakei-setup/deploy/install.sh
```

これ 1 つで次をまとめて行う。**何度実行しても壊れない** (再実行は最新版への更新も兼ねる)。

1. Node.js 20 LTS の確認 (無ければ NodeSource から導入)
2. タイムゾーンを `Asia/Tokyo` に設定
3. `/opt/kakei` にクローン (既にあれば `main` の最新へ更新)
4. ポートの決定と衝突チェック (→ 3 章)
5. `/opt/kakei/.env` を作成 (**既存の `.env` は上書きしない**)
6. `npm ci` ×2 とフロントエンドのビルド
7. `/etc/sudoers.d/kakei-updater` の設置 (自動更新がサービスを再起動するため)
8. systemd への登録 — `kakei-app.service` を **enable** して電源投入時に自動起動、
   `kakei-update.timer` を **enable** して 15 分ごとの更新確認を開始
9. `/healthz` で起動を確認し、アクセス URL を表示

環境変数で挙動を変えられる。

| 変数 | 既定 | 用途 |
|---|---|---|
| `PORT` | `8787` | 待ち受けポート |
| `APP_USER` | `pi` | 実行ユーザー (Pi OS のユーザー名が `pi` でない場合に指定) |
| `APP_DIR` | `/opt/kakei` | 配置先 |
| `BRANCH` | `main` | 追従するブランチ |
| `REPO_URL` | 本リポジトリ | フォークを使う場合 |

```bash
# 例) 8787 も埋まっているので 9000 で、ユーザー名は taro
PORT=9000 APP_USER=taro sudo bash /tmp/kakei-setup/deploy/install.sh
```

導入後は `/opt/kakei` が正となるので、`/tmp/kakei-setup` は削除してよい。
以降の再実行は `sudo bash /opt/kakei/deploy/install.sh`。

<details>
<summary>インストーラを使わず手動で入れる場合</summary>

```bash
sudo mkdir -p /opt/kakei /opt/kakei/data
sudo chown -R pi:pi /opt/kakei
git clone https://github.com/t-develo/personal-finance-management-app.git /opt/kakei
cd /opt/kakei

deploy/build.sh                      # api/frontend の npm ci + frontend build
cp deploy/env.example /opt/kakei/.env
nano /opt/kakei/.env                 # LOCAL_USER_ID を設定

sudo systemctl enable /opt/kakei/deploy/kakei-app.service
sudo systemctl link   /opt/kakei/deploy/kakei-update.service
sudo systemctl enable /opt/kakei/deploy/kakei-update.timer
sudo systemctl daemon-reload
sudo systemctl start kakei-app kakei-update.timer
```

unit は `/etc/systemd/system` へコピーせず、リポジトリ内のファイルへの
シンボリックリンクとして登録する。こうしておくと自動更新で unit が変わっても
`daemon-reload` だけで反映される。

自動更新がサービスを再起動できるよう、`deploy/kakei-updater.sudoers` の
プレースホルダを置換して `/etc/sudoers.d/kakei-updater` にも置くこと。
</details>

## 3. ポート

既定は **8787**。ラズパイでは 8080 を別のアプリが使っていることが多いため、
衝突しにくい値にしてある。

- **初回に変える**: `PORT=9000 sudo bash deploy/install.sh`
- **後から変える**: `/opt/kakei/.env` の `PORT` を書き換えて
  `sudo systemctl restart kakei-app`
- **開発時 (手元の PC)**: `PORT=9000 npm run dev` — vite のプロキシ先も追従する

インストーラは指定されたポートが他のプロセスに使われていればエラーで停止する
(稼働中の `kakei-app` 自身の場合を除く)。既に `.env` がある場合、その `PORT` は
再実行しても書き換えられない。

## 4. 設定

`/opt/kakei/.env` の `LOCAL_USER_ID` を必ず設定する。**Azure 稼働時の `PartitionKey`
と同じ値**にすること。確認方法はどちらでもよい:

- Azure 版にログインした状態でブラウザから `https://<アプリ>/.auth/me` を開き `userId` を見る
- 次項の `export-azure.js` の実行ログに、検出された userId が表示される

```bash
sudo nano /opt/kakei/.env
sudo systemctl restart kakei-app
```

## 5. データ移行

Azure のアクセスキー (ポータル > ストレージアカウント > アクセスキー) を用意する。

```bash
cd /opt/kakei/api

# 5-1. Azure から JSON にエクスポート → /opt/kakei/data/export/*.json
STORAGE_ACCOUNT_NAME=xxxxx STORAGE_ACCOUNT_KEY=yyyyy \
  npm run migrate:export

# 5-2. JSON を SQLite に取り込む (冪等。何度実行してもよい)
npm run migrate:import -- --db /opt/kakei/data/kakei.db

# 5-3. Azure と SQLite を突き合わせて差分を確認する
STORAGE_ACCOUNT_NAME=xxxxx STORAGE_ACCOUNT_KEY=yyyyy \
  npm run migrate:verify -- --db /opt/kakei/data/kakei.db
```

`migrate:verify` が「差分なし」で終了 (終了コード 0) すれば移行完了。

userId を別の値に付け替えたい場合のみ、`migrate:import` と `migrate:verify` の
両方に `--user-id <新しいID>` を付ける (通常は不要)。

移行中はサーバーを止めておくこと (`sudo systemctl stop kakei-app`)。同時に書くと
`SQLITE_BUSY` になる。

## 6. アクセス

LAN 内の PC / スマホから `http://<ラズパイのIP>:8787` を開く。
ルーターで固定 IP を割り当てるか、mDNS (`http://raspberrypi.local:8787`) を使うと楽。

```bash
systemctl status kakei-app          # 稼働状況
journalctl -u kakei-app -f          # ログ
curl -s localhost:8787/healthz      # 死活確認 + 稼働中の commit
```

`/healthz` の応答例:

```json
{"status":"ok","commit":"0f30ab3…","backend":"sqlite","frontendDist":true,"uptimeSec":1234}
```

---

## 自動アップデート

`kakei-update.timer` が **起動 2 分後と、以降 15 分ごと** に `deploy/update.sh` を実行する。
GitHub の `main` に差分が無ければ数秒で終わるので、ラズパイの負荷はほぼゼロ。

差分があったときだけ、この順で処理する。

1. fast-forward できるか確認 (できなければ何もせず終了)
2. **DB をバックアップ** (`api/scripts/backup-sqlite.js`) — 失敗したら更新しない
3. `git merge --ff-only`
4. `deploy/build.sh` (`npm ci` ×2 + フロントエンドのビルド) — 失敗したら旧コードのまま稼働継続
5. `deploy/` に変更があれば `systemctl daemon-reload`
6. `systemctl restart kakei-app`
7. `/healthz` で最大 30 秒リトライして確認

```bash
systemctl list-timers kakei-update.timer   # 次回の実行時刻
journalctl -u kakei-update -f              # 更新ログ
journalctl -u kakei-update -n 50           # 直近の実行結果

sudo systemctl start kakei-update.service  # 今すぐ確認・更新する
/opt/kakei/deploy/update.sh --check        # 更新の有無を見るだけ (適用しない)
/opt/kakei/deploy/update.sh --force        # 差分が無くても再ビルド・再起動

sudo systemctl disable --now kakei-update.timer   # 自動更新を止める
sudo systemctl enable  --now kakei-update.timer   # 再開する
```

**追従するブランチを変える**には `kakei-update.service` に `Environment=BRANCH=xxx` を
足すか、`/opt/kakei/.env` に `BRANCH=xxx` を書いて `sudo systemctl daemon-reload`。

**自動ロールバックはしない。** 更新後に `/healthz` が通らなかった場合は
`kakei-update.service` が failed になり、journal に戻し方のコマンドが出力される
(下のトラブルシューティング参照)。

## バックアップ

自動更新の直前にも取られるが、日次でも取っておく。
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

導入直後に一通り確認する。

1. `systemctl status kakei-app` が `active (running)`
2. `curl -s localhost:8787/healthz` が `"status":"ok"` を返す
3. `curl -s localhost:8787/.auth/me` が設定した `userId` を返す
4. `curl -s localhost:8787/api/accounts` が **Azure 版と同じ口座一覧**を返す
5. ブラウザで開き、口座・クレジットカード・固定費・当月の月次記録が Azure 版と一致する
6. 口座を 1 件追加 → 再読み込みしても残っている
7. 口座を削除 → その口座を参照していた固定費・クレカの口座欄が空になる
8. `sudo reboot` → 自動起動し、データが残っている
9. `systemctl list-timers kakei-update.timer` に次回実行時刻が出る
10. `main` に軽微なコミットを push → 15 分以内に `journalctl -u kakei-update` に
    `updated <old>..<new> ok` が出て、`/healthz` の `commit` が新しい SHA に変わる
11. `node scripts/backup-sqlite.js` が成功し、`backup ok` が出る

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
# ターミナル 1: API + 認証エミュレーション (:8787)
cd api
STORE_BACKEND=sqlite SQLITE_PATH=./data/dev.db LOCAL_USER_ID=dev-user npm run start:local

# ターミナル 2: Vite 開発サーバー (:5173、/api と /.auth を :8787 にプロキシ)
cd frontend && npm run dev
```

ポートを変えたときは両方に同じ `PORT` を渡す (`PORT=9000 npm run dev`)。

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| 画面は出るがデータが空 | `LOCAL_USER_ID` が Azure の `PartitionKey` と違う。`.env` を直して `systemctl restart kakei-app` |
| `Error: Cannot find module 'better-sqlite3'` | `cd /opt/kakei/api && npm ci` を実行。ビルドが必要なら `build-essential` `python3` を入れる |
| `frontend dist が見つかりません` の警告 | `/opt/kakei/deploy/build.sh` を実行、または `.env` の `FRONTEND_DIST` を確認 |
| API が 500 を返す | `journalctl -u kakei-app -n 50` でスタックトレースを確認 |
| ポートが埋まっていて起動しない | `ss -ltn` で使用中のポートを確認し、`.env` の `PORT` を空いている値に変えて `systemctl restart kakei-app` |
| `SQLITE_BUSY` | 移行スクリプトとサーバーが同時に書いている。`systemctl stop kakei-app` してから移行する |
| 日時が UTC でずれる | `.env` の `TZ=Asia/Tokyo` と `sudo timedatectl set-timezone Asia/Tokyo` の両方を設定する |
| 自動更新が走らない | `systemctl list-timers kakei-update.timer` で有効か確認。無ければ `sudo systemctl enable --now kakei-update.timer` |
| `kakei-update` が failed (ヘルスチェック失敗) | `journalctl -u kakei-update -n 50` に戻し方が出力されている。<br>`cd /opt/kakei && git reset --hard <前のSHA> && deploy/build.sh && sudo systemctl restart kakei-app` |
| 「fast-forward できません」で更新が止まる | ラズパイ側でファイルを直接編集・コミットしている。`git -C /opt/kakei status` で確認し、捨ててよければ `git -C /opt/kakei reset --hard origin/main` |
| 更新は成功するが古い画面のまま | ブラウザキャッシュ。スーパーリロード (Ctrl+Shift+R)。`curl -s localhost:8787/healthz` の `commit` が新しければサーバー側は更新済み |
