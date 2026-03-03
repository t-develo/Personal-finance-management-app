const {
  verifyToken,
  getTokenFromRequest,
  OWNER_USER_ID,
} = require("./authConfig");

function getUserInfo(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return {
    userId: payload.userId,
    identityProvider: "custom",
    userDetails: "owner",
    userRoles: ["authenticated", "owner"],
  };
}

function requireOwner(request) {
  const user = getUserInfo(request);
  if (!user || !user.userRoles.includes("owner")) {
    return { authorized: false, user: null };
  }
  return { authorized: true, user };
}

module.exports = { getUserInfo, requireOwner };
