#!/usr/bin/env node
//
// export-azure.js が出力した JSON を SQLite に取り込む。
//
//   node scripts/import-sqlite.js --db /opt/kakei/data/kakei.db [--in ../data/export] [--user-id <新しいID>]
//
// upsert で書き込むため何度実行しても重複しない (冪等)。
// --user-id を指定すると、Azure の PartitionKey を別の userId に付け替える。
// 指定しなければ Azure 側の値をそのまま使う (LOCAL_USER_ID をそれに合わせるのが最も安全)。

const fs = require("fs");
const path = require("path");
const { TABLE_NAMES, DEFAULT_EXPORT_DIR, parseArgs } = require("./tables");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inDir = args.in ? path.resolve(args.in) : DEFAULT_EXPORT_DIR;
  const remapUserId = typeof args["user-id"] === "string" ? args["user-id"] : null;

  if (typeof args.db === "string") process.env.SQLITE_PATH = path.resolve(args.db);
  process.env.STORE_BACKEND = "sqlite";
  const store = require("../src/shared/store.sqlite");

  const dbPath = process.env.SQLITE_PATH || "(既定パス)";
  console.log(`入力元: ${inDir}`);
  console.log(`DB    : ${dbPath}`);
  if (remapUserId) console.log(`userId: すべて '${remapUserId}' に付け替えます`);
  console.log("");

  const db = store.getDb();
  let mismatch = false;

  for (const tableName of TABLE_NAMES) {
    const file = path.join(inDir, `${tableName}.json`);
    if (!fs.existsSync(file)) {
      console.error(`  ${tableName}: ${file} がありません。先に export-azure.js を実行してください。`);
      mismatch = true;
      continue;
    }

    const { entities } = JSON.parse(fs.readFileSync(file, "utf8"));

    const targets = entities.map((entity) =>
      remapUserId ? { ...entity, partitionKey: remapUserId } : entity
    );

    // 1 テーブル分を 1 トランザクションで書き込む (途中で落ちても中途半端に残らない)
    db.exec("BEGIN");
    try {
      for (const target of targets) {
        await store.upsert(tableName, target);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    // 書き込んだ 1 件ずつが実際に存在するか確認する
    const physicalTable = store.TABLES[tableName].table;
    const exists = db.prepare(
      `SELECT 1 FROM ${physicalTable} WHERE user_id = ? AND id = ?`
    );
    const stored = targets.filter((t) => exists.get(t.partitionKey, t.rowKey)).length;
    const ok = stored === targets.length;
    if (!ok) mismatch = true;

    console.log(
      `  ${tableName.padEnd(16)} JSON ${String(targets.length).padStart(5)} 件 / ` +
        `SQLite ${String(stored).padStart(5)} 件  ${ok ? "OK" : "不一致"}`
    );
  }

  store.closeDb();

  if (mismatch) {
    console.error("\n件数が一致しないテーブルがあります。");
    process.exit(1);
  }
  console.log("\nインポート完了。");
}

main().catch((error) => {
  console.error("インポートに失敗しました:", error.message);
  process.exit(1);
});
