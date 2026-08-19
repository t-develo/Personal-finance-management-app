const { app } = require("@azure/functions");
const { v4: uuidv4 } = require("uuid");
const store = require("../shared/store");
const { requireOwner } = require("../shared/auth");
const { handleError } = require("../shared/errors");
const { validateFixedPayment } = require("../shared/validators");

const TABLE_NAME = "fixedPayments";

app.http("fixedPayments-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "fixed-payments",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const entities = await store.list(TABLE_NAME, user.userId);
      return {
        jsonBody: entities.map((entity) => ({
          id: entity.rowKey,
          name: entity.name,
          amount: entity.amount,
          accountId: entity.accountId,
          bonusMonths: entity.bonusMonths || "",
          bonusAmount: entity.bonusAmount || 0,
          createdAt: entity.createdAt,
        })),
      };
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

      await store.create(TABLE_NAME, {
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

      await store.merge(TABLE_NAME, {
        partitionKey: user.userId,
        rowKey: id,
        name: body.name,
        amount: body.amount,
        accountId: body.accountId ?? "",
        bonusMonths: body.bonusMonths ?? "",
        bonusAmount: body.bonusAmount ?? 0,
      });

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
      await store.remove(TABLE_NAME, user.userId, id);

      return { status: 204 };
    } catch (error) {
      return handleError(error, context);
    }
  },
});
