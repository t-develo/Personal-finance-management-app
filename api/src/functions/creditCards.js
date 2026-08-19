const { app } = require("@azure/functions");
const { v4: uuidv4 } = require("uuid");
const store = require("../shared/store");
const { requireOwner } = require("../shared/auth");
const { handleError } = require("../shared/errors");
const { validateCreditCard } = require("../shared/validators");

const TABLE_NAME = "creditCards";

app.http("creditCards-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "credit-cards",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const entities = await store.list(TABLE_NAME, user.userId);
      return {
        jsonBody: entities.map((entity) => ({
          id: entity.rowKey,
          name: entity.name,
          accountId: entity.accountId || "",
          createdAt: entity.createdAt,
        })),
      };
    } catch (error) {
      return handleError(error, context);
    }
  },
});

app.http("creditCards-create", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "credit-cards",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const body = await request.json();
      const validationErrors = validateCreditCard(body);
      if (validationErrors.length > 0) {
        return { status: 400, jsonBody: { errors: validationErrors } };
      }

      const id = `cc_${uuidv4()}`;
      const now = new Date().toISOString();

      await store.create(TABLE_NAME, {
        partitionKey: user.userId,
        rowKey: id,
        name: body.name,
        accountId: body.accountId ?? "",
        createdAt: now,
      });

      return {
        status: 201,
        jsonBody: { id, name: body.name, accountId: body.accountId ?? "", createdAt: now },
      };
    } catch (error) {
      return handleError(error, context);
    }
  },
});

app.http("creditCards-update", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "credit-cards/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const id = request.params.id;
      const body = await request.json();
      const validationErrors = validateCreditCard(body);
      if (validationErrors.length > 0) {
        return { status: 400, jsonBody: { errors: validationErrors } };
      }

      await store.merge(TABLE_NAME, {
        partitionKey: user.userId,
        rowKey: id,
        name: body.name,
        accountId: body.accountId ?? "",
      });

      return { jsonBody: { id, name: body.name, accountId: body.accountId ?? "" } };
    } catch (error) {
      return handleError(error, context);
    }
  },
});

app.http("creditCards-delete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "credit-cards/{id}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const id = request.params.id;
      await store.remove(TABLE_NAME, user.userId, id);

      return { status: 204 };
    } catch (error) {
      return handleError(error, context);
    }
  },
});
