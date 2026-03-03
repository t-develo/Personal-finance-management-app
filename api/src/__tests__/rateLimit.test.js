"use strict";

const {
  isRateLimited,
  recordFailedAttempt,
  resetAttempts,
} = require("../shared/rateLimit");

function createRequestWithIp(ip) {
  return {
    headers: {
      get: (name) => (name === "x-forwarded-for" ? ip : null),
    },
  };
}

describe("rateLimit", () => {
  beforeEach(() => {
    const req = createRequestWithIp("192.168.1.1");
    resetAttempts(req);
  });

  it("allows first attempt", () => {
    const req = createRequestWithIp("192.168.1.1");
    expect(isRateLimited(req)).toBe(false);
  });

  it("blocks after 5 failed attempts", () => {
    const req = createRequestWithIp("192.168.1.1");
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(req);
    }
    expect(isRateLimited(req)).toBe(true);
  });

  it("resets on successful login", () => {
    const req = createRequestWithIp("192.168.1.1");
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(req);
    }
    resetAttempts(req);
    expect(isRateLimited(req)).toBe(false);
  });

  it("tracks IPs independently", () => {
    const req1 = createRequestWithIp("10.0.0.1");
    const req2 = createRequestWithIp("10.0.0.2");
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(req1);
    }
    expect(isRateLimited(req1)).toBe(true);
    expect(isRateLimited(req2)).toBe(false);
    resetAttempts(req1);
  });
});
