const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth_token";
const TOKEN_EXPIRY = "7d";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const OWNER_USER_ID = "owner";

function createToken() {
  if (!JWT_SECRET)
    throw new Error("JWT_SECRET environment variable is not set");
  return jwt.sign({ userId: OWNER_USER_ID, role: "owner" }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

function verifyToken(token) {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getTokenFromRequest(request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = cookie.parse(cookieHeader);
  return cookies[COOKIE_NAME] || null;
}

function buildSetCookieHeader(token) {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    !process.env.AZURE_FUNCTIONS_ENVIRONMENT?.includes("Development");
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

function buildClearCookieHeader() {
  return cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

module.exports = {
  JWT_SECRET,
  COOKIE_NAME,
  TOKEN_EXPIRY,
  COOKIE_MAX_AGE,
  OWNER_USER_ID,
  createToken,
  verifyToken,
  getTokenFromRequest,
  buildSetCookieHeader,
  buildClearCookieHeader,
};
