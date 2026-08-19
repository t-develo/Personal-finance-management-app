#!/usr/bin/env node
//
// Azure Table Storage の全エンティティを JSON ファイルにエクスポートする。
//
//   STORAGE_ACCOUNT_NAME=xxx STORAGE_ACCOUNT_KEY=yyy \
//     node scripts/export-azure.js [--out ../data/export]
//
// 出力: <out>/<tableName>.json
// 何度実行しても同じ内容で上書きされる (冪等)。カットオーバー直前の再同期にも使える。

const fs = require("fs");
const path = require("path");
const {
  TABLE_NAMES,
  DEFAULT_EXPORT_DIR,
  parseArgs,
  requireAzureEnv,
  readAzureTable,
} = require("./tables");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = args.out ? path.resolve(args.out) : DEFAULT_EXPORT_DIR;

  requireAzureEnv();
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`エクスポート先: ${outDir}`);
  let total = 0;

  for (const tableName of TABLE_NAMES) {
    const entities = await readAzureTable(tableName);

    // 数値であるべきフィールドが文字列で入っていないか点検する
    for (const entity of entities) {
      for (const field of ["balance", "amount", "bonusAmount"]) {
        if (entity[field] !== undefined && typeof entity[field] !== "number") {
          console.warn(
            `  警告: ${tableName}/${entity.rowKey} の ${field} が数値ではありません ` +
              `(${typeof entity[field]}: ${JSON.stringify(entity[field])})`
          );
        }
      }
    }

    const payload = {
      _meta: {
        table: tableName,
        count: entities.length,
        exportedAt: new Date().toISOString(),
        storageAccount: process.env.STORAGE_ACCOUNT_NAME,
      },
      entities,
    };

    const outFile = path.join(outDir, `${tableName}.json`);
    fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`  ${tableName.padEnd(16)} ${String(entities.length).padStart(5)} 件 -> ${path.basename(outFile)}`);
    total += entities.length;
  }

  // PartitionKey (= userId) の一覧を出す。LOCAL_USER_ID に設定する値の確認用。
  const userIds = new Set();
  for (const tableName of TABLE_NAMES) {
    const file = path.join(outDir, `${tableName}.json`);
    for (const entity of JSON.parse(fs.readFileSync(file, "utf8")).entities) {
      userIds.add(entity.partitionKey);
    }
  }

  console.log(`\n合計 ${total} 件`);
  console.log(`検出された userId (PartitionKey): ${[...userIds].join(", ") || "(なし)"}`);
  console.log("この値を LOCAL_USER_ID に設定すると、移行データがそのまま見えます。");
}

main().catch((error) => {
  console.error("エクスポートに失敗しました:", error.message);
  process.exit(1);
});
