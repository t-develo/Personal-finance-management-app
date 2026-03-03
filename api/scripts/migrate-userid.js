/**
 * One-time migration: changes PartitionKey from old GitHub userId to "owner"
 * for all rows in all data tables.
 *
 * Usage:
 *   OLD_USER_ID=<github-user-id> node scripts/migrate-userid.js
 *
 * Requires STORAGE_ACCOUNT_NAME and STORAGE_ACCOUNT_KEY env vars.
 */
const {
  TableClient,
  AzureNamedKeyCredential,
} = require("@azure/data-tables");

const account = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const oldUserId = process.env.OLD_USER_ID;
const newUserId = "owner";

if (!account || !accountKey || !oldUserId) {
  console.error(
    "Set STORAGE_ACCOUNT_NAME, STORAGE_ACCOUNT_KEY, and OLD_USER_ID"
  );
  process.exit(1);
}

const credential = new AzureNamedKeyCredential(account, accountKey);
const tables = ["accounts", "fixedPayments", "creditCards", "monthlyRecords"];

async function migrateTable(tableName) {
  const client = new TableClient(
    `https://${account}.table.core.windows.net`,
    tableName,
    credential
  );
  let count = 0;

  const iter = client.listEntities({
    queryOptions: { filter: `PartitionKey eq '${oldUserId}'` },
  });

  for await (const entity of iter) {
    const newEntity = { ...entity, partitionKey: newUserId };
    delete newEntity.etag;
    delete newEntity.timestamp;
    await client.createEntity(newEntity);
    await client.deleteEntity(oldUserId, entity.rowKey);
    count++;
  }

  console.log(`${tableName}: migrated ${count} entities`);
}

async function main() {
  for (const table of tables) {
    await migrateTable(table);
  }
  console.log("Migration complete.");
}

main().catch(console.error);
