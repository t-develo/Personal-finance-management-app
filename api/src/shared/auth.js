function getUserInfo(request) {
  const header = request.headers.get("x-ms-client-principal");
  if (!header) return null;
  const encoded = Buffer.from(header, "base64");
  const clientPrincipal = JSON.parse(encoded.toString("ascii"));
  return {
    userId: clientPrincipal.userId,
    identityProvider: clientPrincipal.identityProvider,
    userDetails: clientPrincipal.userDetails,
    userRoles: clientPrincipal.userRoles,
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
