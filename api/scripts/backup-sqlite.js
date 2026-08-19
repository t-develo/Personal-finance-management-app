#!/usr/bin/env node
//
// SQLite DB のバックアップ。better-sqlite3 のオンラインバックアップ API を使うので、
// アプリを止めずに整合性のあるコピーを作れる (sqlite3 CLI は不要)。
//
//   node scripts/backup-sqlite.js [--db <path>] [--out <dir>] [--keep 30]
//
// cron 例 (毎日 3:00、30 世代保持):
//   0 3 * * * cd /opt/kakei/api && /usr/bin/node scripts/backup-sqlite.js >> /var/log/kakei-backup.log 2>&1

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("./tables");

function log(message) {
  console.log(`${new Date().toISOString()} ${message}`);
}

/** DB 本体と付随する -wal / -shm をまとめて削除する。 */
function removeDbFiles(dbFile) {
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(`${dbFile}${suffix}`, { force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dbPath = path.resolve(
    args.db || process.env.SQLITE_PATH || "/opt/kakei/data/kakei.db"
  );
  const outDir = path.resolve(
    args.out || process.env.BACKUP_DIR || path.join(path.dirname(dbPath), "backups")
  );
  const keep = Number(args.keep || process.env.BACKUP_KEEP || 30);

  if (!fs.existsSync(dbPath)) throw new Error(`DB が見つかりません: ${dbPath}`);
  fs.mkdirSync(outDir, { recursive: true });

  const Database = require("better-sqlite3");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "");
  const dest = path.join(outDir, `kakei-${stamp}.db`);

  const db = new Database(dbPath, { readonly: true });
  try {
    await db.backup(dest);
  } finally {
    db.close();
  }

  // 取れたバックアップが実際に読めるか確認する
  const check = new Database(dest, { readonly: true });
  try {
    const { n } = check.prepare("SELECT COUNT(*) AS n FROM accounts").get();
    const integrity = check.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") throw new Error(`integrity_check: ${integrity}`);
    log(`backup ok: ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB, accounts ${n} 件)`);
  } catch (error) {
    check.close();
    removeDbFiles(dest);
    throw new Error(`バックアップの検証に失敗しました: ${error.message}`);
  }
  check.close();

  // 検証のために開いたことで生じる -wal / -shm を残さない
  // (バックアップ本体は単体で完結している)
  fs.rmSync(`${dest}-wal`, { force: true });
  fs.rmSync(`${dest}-shm`, { force: true });

  // 古い世代を削除
  const backups = fs
    .readdirSync(outDir)
    .filter((name) => /^kakei-.*\.db$/.test(name))
    .sort()
    .reverse();
  for (const old of backups.slice(keep)) {
    removeDbFiles(path.join(outDir, old));
    log(`removed old backup: ${old}`);
  }
}

main().catch((error) => {
  console.error("バックアップに失敗しました:", error.message);
  process.exit(1);
});
