const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Map of IP -> { count, firstAttempt }
const attempts = new Map();

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function isRateLimited(request) {
  const ip = getClientIp(request);
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) return false;

  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(request) {
  const ip = getClientIp(request);
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count += 1;
  }
}

function resetAttempts(request) {
  const ip = getClientIp(request);
  attempts.delete(ip);
}

module.exports = { isRateLimited, recordFailedAttempt, resetAttempts };
