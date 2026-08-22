const { getTableClient, escapeODataString } = require("./tableClient");

async function drain(iter) {
  const entities = [];
  for await (const entity of iter) {
    entities.push(entity);
  }
  return entities;
}

async function list(table, userId) {
  const client = getTableClient(table);
  return drain(
    client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${escapeODataString(userId)}'`,
      },
    })
  );
}

async function listByField(table, userId, field, value) {
  const client = getTableClient(table);
  return drain(
    client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${escapeODataString(userId)}' and ${field} eq '${escapeODataString(value)}'`,
      },
    })
  );
}

async function listByRowKeyPrefix(table, userId, prefix) {
  const client = getTableClient(table);
  const escapedPrefix = escapeODataString(prefix);
  return drain(
    client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${escapeODataString(userId)}' and RowKey ge '${escapedPrefix}_' and RowKey lt '${escapedPrefix}~'`,
      },
    })
  );
}

async function create(table, entity) {
  await getTableClient(table).createEntity(entity);
}

async function merge(table, entity) {
  await getTableClient(table).updateEntity(entity, "Merge");
}

async function upsert(table, entity) {
  await getTableClient(table).upsertEntity(entity, "Merge");
}

async function remove(table, userId, rowKey) {
  await getTableClient(table).deleteEntity(userId, rowKey);
}

module.exports = {
  list,
  listByField,
  listByRowKeyPrefix,
  create,
  merge,
  upsert,
  remove,
};
