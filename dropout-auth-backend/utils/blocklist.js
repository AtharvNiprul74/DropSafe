// Simple in-memory token blocklist.
// Good enough for a single-process dev/demo deployment (matches the
// "blocklist using simple js list" requirement). For a real multi-instance
// deployment this would need to move to Redis/Mongo so every instance
// shares the same list — noted in README.

const blockedTokens = new Set();

function blockToken(token) {
  if (token) blockedTokens.add(token);
}

function isBlocked(token) {
  return blockedTokens.has(token);
}

// Optional housekeeping: drop tokens once they would have expired anyway,
// so the Set doesn't grow forever. Call this on an interval if you like.
function purgeExpired(decodeFn) {
  const now = Math.floor(Date.now() / 1000);
  for (const token of blockedTokens) {
    try {
      const decoded = decodeFn(token);
      if (!decoded || !decoded.exp || decoded.exp < now) {
        blockedTokens.delete(token);
      }
    } catch {
      blockedTokens.delete(token);
    }
  }
}

module.exports = { blockToken, isBlocked, purgeExpired };
