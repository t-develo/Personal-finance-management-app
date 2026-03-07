const { app } = require("@azure/functions");
const { v4: uuidv4 } = require("uuid");
const { getTableClient, escapeODataString } = require("../shared/tableClient");
const { requireOwner } = require("../shared/auth");
const { handleError } = require("../shared/errors");
const { validateFixedPayment } = require("../shared/validators");

const TABLE_NAME = "fixedPayments";

// authLevel "anonymous" は Azure SWA のエッジ認証に委任するための設定。
// アクセス制御は staticwebapp.config.json の routes (allowedRoles: ["owner"]) と
// 各ハンドラ内の requireOwner() で実施している。

app.http("fixedPayments-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "fixed-payments",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const client = getTableClient(TABLE_NAME);
      const entities = [];
      const iter = client.listEntities({
        queryOptions: {
          filter: `PartitionKey eq '${escapeODataString(user.userId)}'`,
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
    } catch (error) {
      return handleError(error, context);
    }
  },
});

app.http("fixedPayments-create", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "fixed-payments",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const body = await request.json();
      const validationErrors = validateFixedPayment(body);
      if (validationErrors.length > 0) {
        return { status: 400, jsonBody: { errors: validationErrors } };
      }

      const id = `fp_${uuidv4()}`;
      const now = new Date().toISOString();

      const client = getTableClient(TABLE_NAME);
      await client.createEntity({
        partitionKey: user.userId,
        rowKey: id,
        name: body.name,
        amount: body.amount ?? 0,
        accountId: body.accountId ?? "",
        bonusMonths: body.bonusMonths ?? "",
        bonusAmount: body.bonusAmount ?? 0,
        createdAt: now,
      });

      return {
        status: 201,
        jsonBody: {
          id,
          name: body.name,
          amount: body.amount ?? 0,
          accountId: body.accountId ?? "",
          bonusMonths: body.bonusMonths ?? "",
          bonusAmount: body.bonusAmount ?? 0,
          createdAt: now,
        },
      };
    } catch (error) {
      return handleError(error, context);
    }
  },
});

app.http("fixedPayments-update", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "fixed-payments/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const id = request.params.id;
      const body = await request.json();
      const validationErrors = validateFixedPayment(body);
      if (validationErrors.length > 0) {
        return { status: 400, jsonBody: { errors: validationErrors } };
      }

      const client = getTableClient(TABLE_NAME);
      await client.updateEntity(
        {
          partitionKey: user.userId,
          rowKey: id,
          name: body.name,
          amount: body.amount,
          accountId: body.accountId ?? "",
          bonusMonths: body.bonusMonths ?? "",
          bonusAmount: body.bonusAmount ?? 0,
        },
        "Merge"
      );

      return {
        jsonBody: {
          id,
          name: body.name,
          amount: body.amount,
          accountId: body.accountId ?? "",
          bonusMonths: body.bonusMonths ?? "",
          bonusAmount: body.bonusAmount ?? 0,
        },
      };
    } catch (error) {
      return handleError(error, context);
    }
  },
});

app.http("fixedPayments-delete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "fixed-payments/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const id = request.params.id;
      const client = getTableClient(TABLE_NAME);
      await client.deleteEntity(user.userId, id);

      return { status: 204 };
    } catch (error) {
      return handleError(error, context);
    }
  },
});
