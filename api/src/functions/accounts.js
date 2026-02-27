const { app } = require("@azure/functions");
const { v4: uuidv4 } = require("uuid");
const { getTableClient } = require("../shared/tableClient");
const { requireOwner } = require("../shared/auth");

const TABLE_NAME = "accounts";

app.http("accounts-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "accounts",
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
        balance: entity.balance,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      });
    }
    return { jsonBody: entities };
  },
});

app.http("accounts-create", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "accounts",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const body = await request.json();
    const id = `acc_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const client = getTableClient(TABLE_NAME);
    await client.createEntity({
      partitionKey: user.userId,
      rowKey: id,
      name: body.name,
      balance: body.balance || 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      status: 201,
      jsonBody: {
        id,
        name: body.name,
        balance: body.balance || 0,
        createdAt: now,
        updatedAt: now,
      },
    };
  },
});

app.http("accounts-update", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "accounts/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const id = request.params.id;
    const body = await request.json();
    const now = new Date().toISOString();

    const client = getTableClient(TABLE_NAME);
    await client.updateEntity(
      {
        partitionKey: user.userId,
        rowKey: id,
        name: body.name,
        balance: body.balance,
        updatedAt: now,
      },
      "Merge"
    );

    return { jsonBody: { id, name: body.name, balance: body.balance, updatedAt: now } };
  },
});

app.http("accounts-delete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "accounts/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const id = request.params.id;
    const client = getTableClient(TABLE_NAME);
    await client.deleteEntity(user.userId, id);

    // Clear accountId references in fixedPayments
    const fpClient = getTableClient("fixedPayments");
    const fpIter = fpClient.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${user.userId}' and accountId eq '${id}'`,
      },
    });
    for await (const fp of fpIter) {
      await fpClient.updateEntity(
        {
          partitionKey: user.userId,
          rowKey: fp.rowKey,
          accountId: "",
        },
        "Merge"
      );
    }

    // Clear accountId references in creditCards
    const ccClient = getTableClient("creditCards");
    const ccIter = ccClient.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${user.userId}' and accountId eq '${id}'`,
      },
    });
    for await (const cc of ccIter) {
      await ccClient.updateEntity(
        {
          partitionKey: user.userId,
          rowKey: cc.rowKey,
          accountId: "",
        },
        "Merge"
      );
    }

    return { status: 204 };
  },
});
