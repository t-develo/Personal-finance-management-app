"use strict";

function createAuthenticatedRequest(method, body, params) {
  const principal = {
    userId: "user-test123",
    identityProvider: "github",
    userDetails: "testuser",
    userRoles: ["authenticated", "owner"],
  };
  const encoded = Buffer.from(JSON.stringify(principal)).toString("base64");

  return {
    method,
    params: params || {},
    headers: {
      get: (name) => (name === "x-ms-client-principal" ? encoded : null),
    },
    json: body !== undefined ? jest.fn().mockResolvedValue(body) : jest.fn().mockRejectedValue(new SyntaxError("Unexpected end of JSON input")),
  };
}

function createUnauthenticatedRequest(method, body, params) {
  return {
    method,
    params: params || {},
    headers: {
      get: () => null,
    },
    json: body !== undefined ? jest.fn().mockResolvedValue(body) : jest.fn(),
  };
}

function createMockContext() {
  return {
    log: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    },
  };
}

// api/src/shared/store.js が公開する 7 メソッドのモック。
// list 系は既定で空配列を返す。
function createMockStore() {
  return {
    list: jest.fn().mockResolvedValue([]),
    listByField: jest.fn().mockResolvedValue([]),
    listByRowKeyPrefix: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue(undefined),
    merge: jest.fn().mockResolvedValue(undefined),
    upsert: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

// clearAllMocks() 後は mockResolvedValue も消えるため、既定の戻り値を張り直す。
function resetMockStore(store) {
  store.list.mockResolvedValue([]);
  store.listByField.mockResolvedValue([]);
  store.listByRowKeyPrefix.mockResolvedValue([]);
  store.create.mockResolvedValue(undefined);
  store.merge.mockResolvedValue(undefined);
  store.upsert.mockResolvedValue(undefined);
  store.remove.mockResolvedValue(undefined);
}

module.exports = {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createMockContext,
  createMockStore,
  resetMockStore,
};
