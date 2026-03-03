"use strict";

process.env.JWT_SECRET = "test-secret-key-minimum-length-for-testing";

const {
  createToken,
  verifyToken,
  getTokenFromRequest,
  buildSetCookieHeader,
  buildClearCookieHeader,
  OWNER_USER_ID,
} = require("../shared/authConfig");

describe("authConfig", () => {
  describe("createToken / verifyToken", () => {
    it("creates a valid JWT that can be verified", () => {
      const token = createToken();
      const payload = verifyToken(token);
      expect(payload.userId).toBe(OWNER_USER_ID);
      expect(payload.role).toBe("owner");
    });

    it("returns null for tampered tokens", () => {
      const payload = verifyToken("invalid.token.here");
      expect(payload).toBeNull();
    });
  });

  describe("getTokenFromRequest", () => {
    it("extracts token from cookie header", () => {
      const request = {
        headers: {
          get: (name) =>
            name === "cookie" ? "auth_token=abc123" : null,
        },
      };
      const token = getTokenFromRequest(request);
      expect(token).toBe("abc123");
    });

    it("returns null when no cookie header exists", () => {
      const request = { headers: { get: () => null } };
      expect(getTokenFromRequest(request)).toBeNull();
    });
  });

  describe("buildSetCookieHeader", () => {
    it("builds a Set-Cookie string with correct attributes", () => {
      const header = buildSetCookieHeader("mytoken");
      expect(header).toContain("auth_token=mytoken");
      expect(header).toContain("HttpOnly");
      expect(header).toContain("Path=/");
      expect(header).toContain("Max-Age=604800");
    });
  });

  describe("buildClearCookieHeader", () => {
    it("builds a clear cookie with Max-Age=0", () => {
      const header = buildClearCookieHeader();
      expect(header).toContain("auth_token=");
      expect(header).toContain("Max-Age=0");
    });
  });
});
