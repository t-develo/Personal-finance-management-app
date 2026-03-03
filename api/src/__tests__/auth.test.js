"use strict";

jest.mock("jsonwebtoken");
jest.mock("cookie");

process.env.JWT_SECRET = "test-secret-key-for-testing-only";

const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { getUserInfo, requireOwner } = require("../shared/auth");

function createRequestWithCookie(cookieHeader) {
  return {
    headers: {
      get: (name) => (name === "cookie" ? cookieHeader : null),
    },
  };
}

function createRequestWithoutCookie() {
  return {
    headers: {
      get: () => null,
    },
  };
}

describe("getUserInfo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cookieがない場合はnullを返す", () => {
    const request = createRequestWithoutCookie();
    const result = getUserInfo(request);
    expect(result).toBeNull();
  });

  it("有効なJWTトークンがある場合はユーザー情報を返す", () => {
    cookie.parse.mockReturnValue({ auth_token: "valid-token" });
    jwt.verify.mockReturnValue({ userId: "owner", role: "owner" });

    const request = createRequestWithCookie("auth_token=valid-token");
    const result = getUserInfo(request);

    expect(result).toEqual({
      userId: "owner",
      identityProvider: "custom",
      userDetails: "owner",
      userRoles: ["authenticated", "owner"],
    });
  });

  it("無効なトークンの場合はnullを返す", () => {
    cookie.parse.mockReturnValue({ auth_token: "invalid-token" });
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid");
    });

    const request = createRequestWithCookie("auth_token=invalid-token");
    const result = getUserInfo(request);

    expect(result).toBeNull();
  });

  it("auth_tokenがcookieにない場合はnullを返す", () => {
    cookie.parse.mockReturnValue({ other_cookie: "value" });

    const request = createRequestWithCookie("other_cookie=value");
    const result = getUserInfo(request);

    expect(result).toBeNull();
  });
});

describe("requireOwner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("有効な認証済みオーナーの場合はauthorized: trueを返す", () => {
    cookie.parse.mockReturnValue({ auth_token: "valid-token" });
    jwt.verify.mockReturnValue({ userId: "owner", role: "owner" });

    const request = createRequestWithCookie("auth_token=valid-token");
    const result = requireOwner(request);

    expect(result.authorized).toBe(true);
    expect(result.user).not.toBeNull();
    expect(result.user.userId).toBe("owner");
    expect(result.user.userRoles).toContain("owner");
  });

  it("認証ヘッダーが存在しない場合はauthorized: falseを返す", () => {
    const request = createRequestWithoutCookie();
    const result = requireOwner(request);

    expect(result.authorized).toBe(false);
    expect(result.user).toBeNull();
  });

  it("無効なトークンの場合はauthorized: falseを返す", () => {
    cookie.parse.mockReturnValue({ auth_token: "bad-token" });
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid");
    });

    const request = createRequestWithCookie("auth_token=bad-token");
    const result = requireOwner(request);

    expect(result.authorized).toBe(false);
    expect(result.user).toBeNull();
  });
});
