function handleError(error, context) {
  if (error instanceof SyntaxError) {
    context.log.error("Invalid JSON in request body:", error.message);
    return { status: 400, jsonBody: { error: "リクエストの形式が不正です" } };
  }

  if (error.statusCode === 404) {
    context.log.error("Resource not found:", error.message);
    return { status: 404, jsonBody: { error: "リソースが見つかりません" } };
  }

  if (error.statusCode === 409) {
    context.log.error("Resource conflict:", error.message);
    return { status: 409, jsonBody: { error: "リソースが競合しています" } };
  }

  context.log.error("Internal server error:", error.message);
  return { status: 500, jsonBody: { error: "内部サーバーエラー" } };
}

module.exports = { handleError };
