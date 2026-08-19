const { app } = require("@azure/functions");
const store = require("../shared/store");
const { requireOwner } = require("../shared/auth");
const { handleError } = require("../shared/errors");
const { validateYearMonth, validateMonthlyRecords } = require("../shared/validators");

const TABLE_NAME = "monthlyRecords";

app.http("monthlyRecords-get", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "monthly/{yearMonth}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const yearMonth = request.params.yearMonth;
      if (!validateYearMonth(yearMonth)) {
        return {
          status: 400,
          jsonBody: { error: "yearMonth の形式が不正です (YYYY-MM)" },
        };
      }

      const accountBalances = {};
      const cardPayments = {};

      const entities = await store.listByRowKeyPrefix(
        TABLE_NAME,
        user.userId,
        yearMonth
      );

      for (const entity of entities) {
        if (entity.recordType === "accountBalance") {
          accountBalances[entity.targetId] = entity.amount;
        } else if (entity.recordType === "cardPayment") {
          cardPayments[entity.targetId] = entity.amount;
        }
      }

      return { jsonBody: { yearMonth, accountBalances, cardPayments } };
    } catch (error) {
      return handleError(error, context);
    }
  },
});

app.http("monthlyRecords-put", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "monthly/{yearMonth}",
  handler: async (request, context) => {
    const { authorized, user } = requireOwner(request);
    if (!authorized) return { status: 403 };

    try {
      const yearMonth = request.params.yearMonth;
      if (!validateYearMonth(yearMonth)) {
        return {
          status: 400,
          jsonBody: { error: "yearMonth の形式が不正です (YYYY-MM)" },
        };
      }

      const body = await request.json();
      const validationErrors = validateMonthlyRecords(body);
      if (validationErrors.length > 0) {
        return { status: 400, jsonBody: { errors: validationErrors } };
      }

      // Upsert account balances
      if (body.accountBalances) {
        for (const [accountId, amount] of Object.entries(body.accountBalances)) {
          await store.upsert(TABLE_NAME, {
            partitionKey: user.userId,
            rowKey: `${yearMonth}_balance_${accountId}`,
            recordType: "accountBalance",
            targetId: accountId,
            amount: amount,
            yearMonth: yearMonth,
          });
        }
      }

      // Upsert card payments
      if (body.cardPayments) {
        for (const [cardId, amount] of Object.entries(body.cardPayments)) {
          await store.upsert(TABLE_NAME, {
            partitionKey: user.userId,
            rowKey: `${yearMonth}_card_${cardId}`,
            recordType: "cardPayment",
            targetId: cardId,
            amount: amount,
            yearMonth: yearMonth,
          });
        }
      }

      return {
        jsonBody: {
          yearMonth,
          accountBalances: body.accountBalances || {},
          cardPayments: body.cardPayments || {},
        },
      };
    } catch (error) {
      return handleError(error, context);
    }
  },
});
