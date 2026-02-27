const { app } = require("@azure/functions");
const { v4: uuidv4 } = require("uuid");
const { getTableClient } = require("../shared/tableClient");
const { requireOwner } = require("../shared/auth");

const TABLE_NAME = "fixedPayments";

app.http("fixedPayments-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "fixed-payments",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const client = getTableClient(TABLE_NAME);
    const entities = [];
    const iter = client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${user.userId}'`,
      },
    });
    for await (const entity of iter) {
      entities.push({
        id: entity.rowKey,
        name: entity.name,
        amount: entity.amount,
        accountId: entity.accountId,
        bonusMonths: entity.bonusMonths || "",
        bonusAmount: entity.bonusAmount || 0,
        createdAt: entity.createdAt,
      });
    }
    return { jsonBody: entities };
  },
});

app.http("fixedPayments-create", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "fixed-payments",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const body = await request.json();
    const id = `fp_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const client = getTableClient(TABLE_NAME);
    await client.createEntity({
      partitionKey: user.userId,
      rowKey: id,
      name: body.name,
      amount: body.amount || 0,
      accountId: body.accountId || "",
      bonusMonths: body.bonusMonths || "",
      bonusAmount: body.bonusAmount || 0,
      createdAt: now,
    });

    return {
      status: 201,
      jsonBody: {
        id,
        name: body.name,
        amount: body.amount || 0,
        accountId: body.accountId || "",
        bonusMonths: body.bonusMonths || "",
        bonusAmount: body.bonusAmount || 0,
        createdAt: now,
      },
    };
  },
});

app.http("fixedPayments-update", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "fixed-payments/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const id = request.params.id;
    const body = await request.json();

    const client = getTableClient(TABLE_NAME);
    await client.updateEntity(
      {
        partitionKey: user.userId,
        rowKey: id,
        name: body.name,
        amount: body.amount,
        accountId: body.accountId || "",
        bonusMonths: body.bonusMonths || "",
        bonusAmount: body.bonusAmount || 0,
      },
      "Merge"
    );

    return {
      jsonBody: {
        id,
        name: body.name,
        amount: body.amount,
        accountId: body.accountId || "",
        bonusMonths: body.bonusMonths || "",
        bonusAmount: body.bonusAmount || 0,
      },
    };
  },
});

app.http("fixedPayments-delete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "fixed-payments/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const id = request.params.id;
    const client = getTableClient(TABLE_NAME);
    await client.deleteEntity(user.userId, id);

    return { status: 204 };
  },
});
