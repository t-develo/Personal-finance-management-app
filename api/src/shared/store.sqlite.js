const fs = require("fs");
const path = require("path");

// 論理テーブル名 (Azure Table 名) → 物理テーブル名 + フィールド ⇄ カラム対応。
const TABLES = {
  accounts: {
    table: "accounts",
    fields: {
      name: "name",
      balance: "balance",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  creditCards: {
    table: "credit_cards",
    fields: {
      name: "name",
      accountId: "account_id",
      createdAt: "created_at",
    },
  },
  fixedPayments: {
    table: "fixed_payments",
    fields: {
      name: "name",
      amount: "amount",
      accountId: "account_id",
      bonusMonths: "bonus_months",
      bonusAmount: "bonus_amount",
      createdAt: "created_at",
    },
  },
  monthlyRecords: {
    table: "monthly_records",
    fields: {
      recordType: "record_type",
      targetId: "target_id",
      amount: "amount",
      yearMonth: "year_month",
    },
  },
};

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function schemaFor(table) {
  const schema = TABLES[table];
  if (!schema) throw new Error(`Unknown table: ${table}`);
  return schema;
}

let db = null;

function getDb() {
  if (db) return db;

  // ネイティブモジュールなので遅延 require する。
  // Azure (STORE_BACKEND=azure) では読み込まれず、インストールされていなくてもよい。
  const Database = require("better-sqlite3");

  const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), "data", "kakei.db");
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  db = new Database(dbPath);
  if (dbPath !== ":memory:") {
    // 書き込み量が極小なので、SD カードの寿命より停電時の整合性を優先する。
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = FULL");
  }
  db.pragma("busy_timeout = 5000");
  db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

  return db;
}

// テスト用: プロセス内で開いている接続を閉じ、次回 getDb() で開き直させる。
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function rowToEntity(schema, row) {
  const entity = { partitionKey: row.user_id, rowKey: row.id };
  for (const [field, column] of Object.entries(schema.fields)) {
    entity[field] = row[column];
  }
  return entity;
}

// entity から partitionKey/rowKey を除いた「実際に渡されたフィールド」だけを取り出す。
// Table Storage の Merge 意味論 (未指定フィールドは保持) を再現するために使う。
function toColumns(schema, entity) {
  const columns = {};
  for (const [field, value] of Object.entries(entity)) {
    if (field === "partitionKey" || field === "rowKey") continue;
    const column = schema.fields[field];
    if (!column) throw new Error(`Unknown field '${field}' for table '${schema.table}'`);
    columns[column] = value;
  }
  return columns;
}

async function list(table, userId) {
  const schema = schemaFor(table);
  const rows = getDb()
    .prepare(`SELECT * FROM ${schema.table} WHERE user_id = ? ORDER BY id`)
    .all(userId);
  return rows.map((row) => rowToEntity(schema, row));
}

async function listByField(table, userId, field, value) {
  const schema = schemaFor(table);
  const column = schema.fields[field];
  if (!column) throw new Error(`Unknown field '${field}' for table '${schema.table}'`);
  const rows = getDb()
    .prepare(
      `SELECT * FROM ${schema.table} WHERE user_id = ? AND ${column} = ? ORDER BY id`
    )
    .all(userId, value);
  return rows.map((row) => rowToEntity(schema, row));
}

// Azure 側の `RowKey ge '<prefix>_' and RowKey lt '<prefix>~'` と同じ範囲を返す。
// 主キー (user_id, id) のインデックスがそのまま効く。
async function listByRowKeyPrefix(table, userId, prefix) {
  const schema = schemaFor(table);
  const rows = getDb()
    .prepare(
      `SELECT * FROM ${schema.table} WHERE user_id = ? AND id >= ? AND id < ? ORDER BY id`
    )
    .all(userId, `${prefix}_`, `${prefix}~`);
  return rows.map((row) => rowToEntity(schema, row));
}

async function create(table, entity) {
  const schema = schemaFor(table);
  const columns = toColumns(schema, entity);
  const names = ["user_id", "id", ...Object.keys(columns)];
  const values = [entity.partitionKey, entity.rowKey, ...Object.values(columns)];

  try {
    getDb()
      .prepare(
        `INSERT INTO ${schema.table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`
      )
      .run(...values);
  } catch (error) {
    if (String(error.code).startsWith("SQLITE_CONSTRAINT")) {
      throw httpError(`Entity already exists: ${table}/${entity.rowKey}`, 409);
    }
    throw error;
  }
}

async function merge(table, entity) {
  const schema = schemaFor(table);
  const columns = toColumns(schema, entity);
  const database = getDb();

  if (Object.keys(columns).length === 0) {
    const found = database
      .prepare(`SELECT 1 FROM ${schema.table} WHERE user_id = ? AND id = ?`)
      .get(entity.partitionKey, entity.rowKey);
    if (!found) throw httpError(`Entity not found: ${table}/${entity.rowKey}`, 404);
    return;
  }

  const assignments = Object.keys(columns)
    .map((column) => `${column} = ?`)
    .join(", ");
  const result = database
    .prepare(`UPDATE ${schema.table} SET ${assignments} WHERE user_id = ? AND id = ?`)
    .run(...Object.values(columns), entity.partitionKey, entity.rowKey);

  if (result.changes === 0) {
    throw httpError(`Entity not found: ${table}/${entity.rowKey}`, 404);
  }
}

async function upsert(table, entity) {
  const schema = schemaFor(table);
  const columns = toColumns(schema, entity);
  const names = ["user_id", "id", ...Object.keys(columns)];
  const values = [entity.partitionKey, entity.rowKey, ...Object.values(columns)];

  // 競合時は「渡されたフィールドだけ」を更新する (Merge 意味論)。
  const updates = Object.keys(columns)
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");
  const conflictClause = updates
    ? `ON CONFLICT(user_id, id) DO UPDATE SET ${updates}`
    : `ON CONFLICT(user_id, id) DO NOTHING`;

  getDb()
    .prepare(
      `INSERT INTO ${schema.table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")}) ${conflictClause}`
    )
    .run(...values);
}

async function remove(table, userId, rowKey) {
  const schema = schemaFor(table);
  const result = getDb()
    .prepare(`DELETE FROM ${schema.table} WHERE user_id = ? AND id = ?`)
    .run(userId, rowKey);

  if (result.changes === 0) {
    throw httpError(`Entity not found: ${table}/${rowKey}`, 404);
  }
}

module.exports = {
  list,
  listByField,
  listByRowKeyPrefix,
  create,
  merge,
  upsert,
  remove,
  // 移行スクリプトとテストから使う内部ユーティリティ。
  TABLES,
  getDb,
  closeDb,
};
