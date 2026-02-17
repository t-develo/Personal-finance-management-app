const { app } = require("@azure/functions");
const { getTableClient } = require("../shared/tableClient");
const { requireOwner } = require("../shared/auth");

const TABLE_NAME = "monthlyRecords";

app.http("monthlyRecords-get", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "monthly/{yearMonth}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const yearMonth = request.params.yearMonth;
    const client = getTableClient(TABLE_NAME);

    const accountBalances = {};
    const cardPayments = {};

    const iter = client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${user.userId}' and RowKey ge '${yearMonth}_' and RowKey lt '${yearMonth}~'`,
      },
    });

    for await (const entity of iter) {
      if (entity.recordType === "accountBalance") {
        accountBalances[entity.targetId] = entity.amount;
      } else if (entity.recordType === "cardPayment") {
        cardPayments[entity.targetId] = entity.amount;
      }
    }

    return { jsonBody: { yearMonth, accountBalances, cardPayments } };
  },
});

app.http("monthlyRecords-put", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "monthly/{yearMonth}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const yearMonth = request.params.yearMonth;
    const body = await request.json();
    const client = getTableClient(TABLE_NAME);

    // Upsert account balances
    if (body.accountBalances) {
      for (const [accountId, amount] of Object.entries(body.accountBalances)) {
        await client.upsertEntity(
          {
            partitionKey: user.userId,
            rowKey: `${yearMonth}_balance_${accountId}`,
            recordType: "accountBalance",
            targetId: accountId,
            amount: amount,
            yearMonth: yearMonth,
          },
          "Merge"
        );
      }
    }

    // Upsert card payments
    if (body.cardPayments) {
      for (const [cardId, amount] of Object.entries(body.cardPayments)) {
        await client.upsertEntity(
          {
            partitionKey: user.userId,
            rowKey: `${yearMonth}_card_${cardId}`,
            recordType: "cardPayment",
            targetId: cardId,
            amount: amount,
            yearMonth: yearMonth,
          },
          "Merge"
        );
      }
    }

    return { jsonBody: { yearMonth, accountBalances: body.accountBalances || {}, cardPayments: body.cardPayments || {} } };
  },
});
