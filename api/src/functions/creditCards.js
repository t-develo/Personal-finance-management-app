const { app } = require("@azure/functions");
const { v4: uuidv4 } = require("uuid");
const { getTableClient } = require("../shared/tableClient");
const { requireOwner } = require("../shared/auth");

const TABLE_NAME = "creditCards";

app.http("creditCards-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "credit-cards",
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
        createdAt: entity.createdAt,
      });
    }
    return { jsonBody: entities };
  },
});

app.http("creditCards-create", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "credit-cards",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const body = await request.json();
    const id = `cc_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const client = getTableClient(TABLE_NAME);
    await client.createEntity({
      partitionKey: user.userId,
      rowKey: id,
      name: body.name,
      createdAt: now,
    });

    return {
      status: 201,
      jsonBody: { id, name: body.name, createdAt: now },
    };
  },
});

app.http("creditCards-update", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "credit-cards/{id}",
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
      },
      "Merge"
    );

    return { jsonBody: { id, name: body.name } };
  },
});

app.http("creditCards-delete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "credit-cards/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    const id = request.params.id;
    const client = getTableClient(TABLE_NAME);
    await client.deleteEntity(user.userId, id);

    return { status: 204 };
  },
});
