// 移行スクリプト共通の定義とユーティリティ。

// Azure Table Storage 上のテーブル名 (= ストア抽象層の論理テーブル名)。
const TABLE_NAMES = ["accounts", "creditCards", "fixedPayments", "monthlyRecords"];

const DEFAULT_EXPORT_DIR = require("path").join(
  __dirname,
  "..",
  "..",
  "data",
  "export"
);

/**
 * `--key value` 形式の引数を { key: value } に変換する。
 * 値を伴わないフラグは true になる。
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

/**
 * Azure Table のシステムプロパティを落とし、アプリのフィールドだけを残す。
 * (timestamp / etag / odata.* は移行先で持つ必要がない)
 */
function stripSystemProperties(entity) {
  const cleaned = {};
  for (const [key, value] of Object.entries(entity)) {
    if (key === "timestamp" || key === "etag" || key.startsWith("odata.")) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

function requireAzureEnv() {
  const { STORAGE_ACCOUNT_NAME, STORAGE_ACCOUNT_KEY } = process.env;
  if (!STORAGE_ACCOUNT_NAME || !STORAGE_ACCOUNT_KEY) {
    throw new Error(
      "STORAGE_ACCOUNT_NAME と STORAGE_ACCOUNT_KEY を設定してください " +
        "(Azure ポータルのストレージアカウント > アクセスキー)。"
    );
  }
}

/** Azure Table から 1 テーブル分のエンティティを全件読み込む。 */
async function readAzureTable(tableName) {
  const { getTableClient } = require("../src/shared/tableClient");
  const entities = [];
  for await (const entity of getTableClient(tableName).listEntities()) {
    entities.push(stripSystemProperties(entity));
  }
  return entities;
}

module.exports = {
  TABLE_NAMES,
  DEFAULT_EXPORT_DIR,
  parseArgs,
  stripSystemProperties,
  requireAzureEnv,
  readAzureTable,
};
