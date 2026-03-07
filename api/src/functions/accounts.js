const { app } = require("@azure/functions");
const { v4: uuidv4 } = require("uuid");
const { getTableClient, escapeODataString } = require("../shared/tableClient");
const { requireOwner } = require("../shared/auth");
const { handleError } = require("../shared/errors");
const { validateAccount } = require("../shared/validators");

const TABLE_NAME = "accounts";

// authLevel "anonymous" は Azure SWA のエッジ認証に委任するための設定。
// アクセス制御は staticwebapp.config.json の routes (allowedRoles: ["owner"]) と
// 各ハンドラ内の requireOwner() で実施している。

app.http("accounts-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "accounts",
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
          balance: entity.balance,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        });
      }
      return { jsonBody: entities };
    } catch (error) {
      return handleError(error, context);
    }
  },
});

app.http("accounts-create", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "accounts",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const body = await request.json();
      const validationErrors = validateAccount(body);
      if (validationErrors.length > 0) {
        return { status: 400, jsonBody: { errors: validationErrors } };
      }

      const id = `acc_${uuidv4()}`;
      const now = new Date().toISOString();

      const client = getTableClient(TABLE_NAME);
      await client.createEntity({
        partitionKey: user.userId,
        rowKey: id,
        name: body.name,
        balance: body.balance ?? 0,
        createdAt: now,
        updatedAt: now,
      });

      return {
        status: 201,
        jsonBody: {
          id,
          name: body.name,
          balance: body.balance ?? 0,
          createdAt: now,
          updatedAt: now,
        },
      };
    } catch (error) {
      return handleError(error, context);
    }
  },
});

app.http("accounts-update", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "accounts/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const id = request.params.id;
      const body = await request.json();
      const validationErrors = validateAccount(body);
      if (validationErrors.length > 0) {
        return { status: 400, jsonBody: { errors: validationErrors } };
      }

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
    } catch (error) {
      return handleError(error, context);
    }
  },
});

app.http("accounts-delete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "accounts/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const id = request.params.id;
      const client = getTableClient(TABLE_NAME);
      await client.deleteEntity(user.userId, id);

      // Clear accountId references in fixedPayments (with partial failure tolerance)
      const cascadeErrors = [];

      const fpClient = getTableClient("fixedPayments");
      const fpIter = fpClient.listEntities({
        queryOptions: {
          filter: `PartitionKey eq '${escapeODataString(user.userId)}' and accountId eq '${escapeODataString(id)}'`,
        },
      });
      for await (const fp of fpIter) {
        try {
          await fpClient.updateEntity(
            {
              partitionKey: user.userId,
              rowKey: fp.rowKey,
              accountId: "",
            },
            "Merge"
          );
        } catch (e) {
          context.log.error(`Failed to clear accountId on fixedPayment ${fp.rowKey}:`, e);
          cascadeErrors.push(fp.rowKey);
        }
      }

      // Clear accountId references in creditCards
      const ccClient = getTableClient("creditCards");
      const ccIter = ccClient.listEntities({
        queryOptions: {
          filter: `PartitionKey eq '${escapeODataString(user.userId)}' and accountId eq '${escapeODataString(id)}'`,
        },
      });
      for await (const cc of ccIter) {
        try {
          await ccClient.updateEntity(
            {
              partitionKey: user.userId,
              rowKey: cc.rowKey,
              accountId: "",
            },
            "Merge"
          );
        } catch (e) {
          context.log.error(`Failed to clear accountId on creditCard ${cc.rowKey}:`, e);
          cascadeErrors.push(cc.rowKey);
        }
      }

      if (cascadeErrors.length > 0) {
        return {
          status: 207,
          jsonBody: {
            warning: "口座は削除されましたが、一部の関連データ更新に失敗しました",
            failedIds: cascadeErrors,
          },
        };
      }

      return { status: 204 };
    } catch (error) {
      return handleError(error, context);
    }
  },
});
