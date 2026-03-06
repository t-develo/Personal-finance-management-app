const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const account = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const credential = new AzureNamedKeyCredential(account, accountKey);

function getTableClient(tableName) {
  return new TableClient(
    `https://${account}.table.core.windows.net`,
    tableName,
    credential
  );
}

function escapeODataString(value) {
  return String(value).replace(/'/g, "''");
}

module.exports = { getTableClient, escapeODataString };
