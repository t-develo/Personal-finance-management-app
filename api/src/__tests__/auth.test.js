"use strict";

const { getUserInfo, requireOwner } = require("../shared/auth");

// テスト用リクエストヘルパー
function createRequest(principalData) {
  const encoded = Buffer.from(JSON.stringify(principalData)).toString("base64");
  return {
    headers: {
      get: (name) =>
        name === "x-ms-client-principal" ? encoded : null,
    },
  };
}

function createRequestWithoutHeader() {
  return {
    headers: {
      get: () => null,
    },
  };
}

function createRequestWithRoles(roles) {
  return createRequest({
    userId: "user-abc123",
    identityProvider: "github",
    userDetails: "testuser",
    userRoles: roles,
  });
}

describe("getUserInfo", () => {
  describe("x-ms-client-principalヘッダーが存在する場合", () => {
    it("base64デコードしたユーザー情報を返す", () => {
      const principal = {
        userId: "user-abc123",
        identityProvider: "github",
        userDetails: "testuser",
        userRoles: ["authenticated", "owner"],
      };
      const request = createRequest(principal);

      const result = getUserInfo(request);

      expect(result).toEqual({
        userId: "user-abc123",
        identityProvider: "github",
        userDetails: "testuser",
        userRoles: ["authenticated", "owner"],
      });
    });

    it("ロールが複数ある場合もすべて返す", () => {
      const principal = {
        userId: "user-xyz",
        identityProvider: "github",
        userDetails: "multiroluser",
        userRoles: ["anonymous", "authenticated", "owner"],
      };
      const request = createRequest(principal);

      const result = getUserInfo(request);

      expect(result.userRoles).toEqual(["anonymous", "authenticated", "owner"]);
    });

    it("ロールが空配列の場合も正常に返す", () => {
      const principal = {
        userId: "user-noroles",
        identityProvider: "github",
        userDetails: "noroleuser",
        userRoles: [],
      };
      const request = createRequest(principal);

      const result = getUserInfo(request);

      expect(result.userRoles).toEqual([]);
    });
  });

  describe("x-ms-client-principalヘッダーが存在しない場合", () => {
    it("nullを返す", () => {
      const request = createRequestWithoutHeader();

      const result = getUserInfo(request);

      expect(result).toBeNull();
    });
  });
});

describe("requireOwner", () => {
  describe("ownerロールを持つ認証済みユーザーの場合", () => {
    it("authorized: trueとユーザー情報を返す", () => {
      const request = createRequestWithRoles(["authenticated", "owner"]);

      const result = requireOwner(request);

      expect(result.authorized).toBe(true);
      expect(result.user).not.toBeNull();
    });

    it("返されるユーザー情報にuserIdが含まれる", () => {
      const request = createRequestWithRoles(["authenticated", "owner"]);

      const result = requireOwner(request);

      expect(result.user.userId).toBe("user-abc123");
    });
  });

  describe("ownerロールを持たないユーザーの場合", () => {
    it("authenticatedのみの場合はauthorized: falseを返す", () => {
      const request = createRequestWithRoles(["authenticated"]);

      const result = requireOwner(request);

      expect(result.authorized).toBe(false);
      expect(result.user).toBeNull();
    });

    it("anonymousのみの場合はauthorized: falseを返す", () => {
      const request = createRequestWithRoles(["anonymous"]);

      const result = requireOwner(request);

      expect(result.authorized).toBe(false);
      expect(result.user).toBeNull();
    });

    it("ロールが空の場合はauthorized: falseを返す", () => {
      const request = createRequestWithRoles([]);

      const result = requireOwner(request);

      expect(result.authorized).toBe(false);
      expect(result.user).toBeNull();
    });
  });

  describe("認証ヘッダーが存在しない場合", () => {
    it("authorized: falseとnullユーザーを返す", () => {
      const request = createRequestWithoutHeader();

      const result = requireOwner(request);

      expect(result.authorized).toBe(false);
      expect(result.user).toBeNull();
    });
  });
});
