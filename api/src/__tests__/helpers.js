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

function createMockTableClient() {
  return {
    createEntity: jest.fn().mockResolvedValue({}),
    updateEntity: jest.fn().mockResolvedValue({}),
    deleteEntity: jest.fn().mockResolvedValue({}),
    upsertEntity: jest.fn().mockResolvedValue({}),
    listEntities: jest.fn().mockReturnValue({
      [Symbol.asyncIterator]: () => ({
        next: jest.fn().mockResolvedValue({ done: true }),
      }),
    }),
  };
}

function createAsyncIterable(items) {
  return {
    [Symbol.asyncIterator]: () => {
      let index = 0;
      return {
        next: () => {
          if (index < items.length) {
            return Promise.resolve({ value: items[index++], done: false });
          }
          return Promise.resolve({ done: true });
        },
      };
    },
  };
}

module.exports = {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createMockContext,
  createMockTableClient,
  createAsyncIterable,
};
