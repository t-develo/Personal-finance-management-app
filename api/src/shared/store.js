// データストアのバックエンド選択。
//
// STORE_BACKEND=azure (既定) … Azure Table Storage (Azure Static Web Apps 稼働用)
// STORE_BACKEND=sqlite        … ローカル SQLite (ラズパイ稼働用)
//
// どちらの実装も同じ 7 メソッドを公開する:
//   list(table, userId)
//   listByField(table, userId, field, value)
//   listByRowKeyPrefix(table, userId, prefix)
//   create(table, entity)
//   merge(table, entity)
//   upsert(table, entity)
//   remove(table, userId, rowKey)
//
// entity の形は Azure Table Storage 由来のまま { partitionKey, rowKey, ...fields }。
const backend = process.env.STORE_BACKEND || "azure";

module.exports =
  backend === "sqlite" ? require("./store.sqlite") : require("./store.azure");
