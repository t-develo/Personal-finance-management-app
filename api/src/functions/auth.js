const { app } = require("@azure/functions");
const bcrypt = require("bcryptjs");
const { getTableClient } = require("../shared/tableClient");
const {
  OWNER_USER_ID,
  createToken,
  verifyToken,
  getTokenFromRequest,
  buildSetCookieHeader,
  buildClearCookieHeader,
} = require("../shared/authConfig");
const {
  isRateLimited,
  recordFailedAttempt,
  resetAttempts,
} = require("../shared/rateLimit");

const AUTH_TABLE = "authUsers";
const BCRYPT_ROUNDS = 12;

async function getOwnerEntity() {
  const client = getTableClient(AUTH_TABLE);
  try {
    return await client.getEntity("auth", "owner");
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw err;
  }
}

// GET /api/auth/status
app.http("auth-status", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "auth/status",
  handler: async (request, context) => {
    const ownerEntity = await getOwnerEntity();
    const registered = !!ownerEntity;

    const token = getTokenFromRequest(request);
    let authenticated = false;
    if (token) {
      const payload = verifyToken(token);
      authenticated = !!payload;
    }

    return {
      jsonBody: {
        registered,
        authenticated,
        user: authenticated
          ? { userId: OWNER_USER_ID, userDetails: "owner" }
          : null,
      },
    };
  },
});

// POST /api/auth/register
app.http("auth-register", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/register",
  handler: async (request, context) => {
    const existing = await getOwnerEntity();
    if (existing) {
      return {
        status: 409,
        jsonBody: { error: "Owner already registered" },
      };
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string" || password.length < 8) {
      return {
        status: 400,
        jsonBody: { error: "Password must be at least 8 characters" },
      };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const client = getTableClient(AUTH_TABLE);
    await client.createEntity({
      partitionKey: "auth",
      rowKey: "owner",
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    const token = createToken();
    return {
      status: 201,
      headers: { "Set-Cookie": buildSetCookieHeader(token) },
      jsonBody: {
        success: true,
        user: { userId: OWNER_USER_ID, userDetails: "owner" },
      },
    };
  },
});

// POST /api/auth/login
app.http("auth-login", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/login",
  handler: async (request, context) => {
    if (isRateLimited(request)) {
      return {
        status: 429,
        jsonBody: {
          error: "Too many login attempts. Try again in 15 minutes.",
        },
      };
    }

    const ownerEntity = await getOwnerEntity();
    if (!ownerEntity) {
      return {
        status: 404,
        jsonBody: { error: "No owner registered" },
      };
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return {
        status: 400,
        jsonBody: { error: "Password is required" },
      };
    }

    const valid = await bcrypt.compare(password, ownerEntity.passwordHash);
    if (!valid) {
      recordFailedAttempt(request);
      return {
        status: 401,
        jsonBody: { error: "Invalid password" },
      };
    }

    resetAttempts(request);
    const token = createToken();
    return {
      headers: { "Set-Cookie": buildSetCookieHeader(token) },
      jsonBody: {
        success: true,
        user: { userId: OWNER_USER_ID, userDetails: "owner" },
      },
    };
  },
});

// POST /api/auth/refresh
app.http("auth-refresh", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/refresh",
  handler: async (request, context) => {
    const token = getTokenFromRequest(request);
    if (!token) {
      return { status: 401, jsonBody: { error: "Not authenticated" } };
    }

    const payload = verifyToken(token);
    if (!payload) {
      return { status: 401, jsonBody: { error: "Invalid or expired token" } };
    }

    const newToken = createToken();
    return {
      headers: { "Set-Cookie": buildSetCookieHeader(newToken) },
      jsonBody: { success: true },
    };
  },
});

// POST /api/auth/logout
app.http("auth-logout", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/logout",
  handler: async (request, context) => {
    return {
      headers: { "Set-Cookie": buildClearCookieHeader() },
      jsonBody: { success: true },
    };
  },
});
