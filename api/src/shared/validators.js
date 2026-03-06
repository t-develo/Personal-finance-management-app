function validateAccount(body) {
  const errors = [];
  if (!body.name || typeof body.name !== "string") errors.push("name は必須の文字列です");
  if (body.name && body.name.length > 100) errors.push("name は100文字以内にしてください");
  if (body.balance !== undefined && typeof body.balance !== "number")
    errors.push("balance は数値にしてください");
  if (
    body.balance !== undefined &&
    (body.balance < -999999999 || body.balance > 999999999)
  )
    errors.push("balance の範囲が不正です");
  return errors;
}

function validateCreditCard(body) {
  const errors = [];
  if (!body.name || typeof body.name !== "string") errors.push("name は必須の文字列です");
  if (body.name && body.name.length > 100) errors.push("name は100文字以内にしてください");
  if (body.accountId !== undefined && typeof body.accountId !== "string")
    errors.push("accountId は文字列にしてください");
  return errors;
}

function validateFixedPayment(body) {
  const errors = [];
  if (!body.name || typeof body.name !== "string") errors.push("name は必須の文字列です");
  if (body.name && body.name.length > 100) errors.push("name は100文字以内にしてください");
  if (body.amount !== undefined && typeof body.amount !== "number")
    errors.push("amount は数値にしてください");
  if (body.amount !== undefined && (body.amount < 0 || body.amount > 999999999))
    errors.push("amount の範囲が不正です");
  if (body.bonusMonths !== undefined && typeof body.bonusMonths !== "string")
    errors.push("bonusMonths は文字列にしてください");
  if (body.bonusAmount !== undefined && typeof body.bonusAmount !== "number")
    errors.push("bonusAmount は数値にしてください");
  if (
    body.bonusAmount !== undefined &&
    (body.bonusAmount < 0 || body.bonusAmount > 999999999)
  )
    errors.push("bonusAmount の範囲が不正です");
  return errors;
}

function validateYearMonth(yearMonth) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth);
}

function validateMonthlyRecords(body) {
  const errors = [];
  if (body.accountBalances !== undefined && typeof body.accountBalances !== "object")
    errors.push("accountBalances はオブジェクトにしてください");
  if (body.cardPayments !== undefined && typeof body.cardPayments !== "object")
    errors.push("cardPayments はオブジェクトにしてください");
  if (body.accountBalances && typeof body.accountBalances === "object") {
    for (const [key, val] of Object.entries(body.accountBalances)) {
      if (typeof val !== "number") errors.push(`accountBalances.${key} は数値にしてください`);
    }
  }
  if (body.cardPayments && typeof body.cardPayments === "object") {
    for (const [key, val] of Object.entries(body.cardPayments)) {
      if (typeof val !== "number") errors.push(`cardPayments.${key} は数値にしてください`);
    }
  }
  return errors;
}

module.exports = {
  validateAccount,
  validateCreditCard,
  validateFixedPayment,
  validateYearMonth,
  validateMonthlyRecords,
};
