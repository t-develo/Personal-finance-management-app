const { app } = require("@azure/functions");
const { v4: uuidv4 } = require("uuid");
const store = require("../shared/store");
const { requireOwner } = require("../shared/auth");
const { handleError } = require("../shared/errors");
const { validateAccount } = require("../shared/validators");

const TABLE_NAME = "accounts";

app.http("accounts-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "accounts",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const entities = await store.list(TABLE_NAME, user.userId);
      return {
        jsonBody: entities.map((entity) => ({
          id: entity.rowKey,
          name: entity.name,
          balance: entity.balance,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        })),
      };
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

      await store.create(TABLE_NAME, {
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

      await store.merge(TABLE_NAME, {
        partitionKey: user.userId,
        rowKey: id,
        name: body.name,
        balance: body.balance,
        updatedAt: now,
      });

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
      await store.remove(TABLE_NAME, user.userId, id);

      // Clear accountId references in fixedPayments (with partial failure tolerance)
      const cascadeErrors = [];

      const fixedPayments = await store.listByField(
        "fixedPayments",
        user.userId,
        "accountId",
        id
      );
      for (const fp of fixedPayments) {
        try {
          await store.merge("fixedPayments", {
            partitionKey: user.userId,
            rowKey: fp.rowKey,
            accountId: "",
          });
        } catch (e) {
          context.log.error(`Failed to clear accountId on fixedPayment ${fp.rowKey}:`, e);
          cascadeErrors.push(fp.rowKey);
        }
      }

      // Clear accountId references in creditCards
      const creditCards = await store.listByField(
        "creditCards",
        user.userId,
        "accountId",
        id
      );
      for (const cc of creditCards) {
        try {
          await store.merge("creditCards", {
            partitionKey: user.userId,
            rowKey: cc.rowKey,
            accountId: "",
          });
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
