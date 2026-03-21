/**
 * Short-lived cache for User.findById in protect() to reduce DB load.
 * Invalidated on profile/avatar updates. Not shared across instances (OK per Railway replica).
 */

const TTL_MS = 45_000;
const MAX_ENTRIES = 400;

const cache = new Map();

export function getCachedUser(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return undefined;
  const entry = cache.get(id);
  if (!entry) return undefined;
  if (Date.now() > entry.exp) {
    cache.delete(id);
    return undefined;
  }
  return entry.user;
}

export function setCachedUser(userId, user) {
  const id = Number(userId);
  if (!Number.isFinite(id) || !user) return;
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(id, { user, exp: Date.now() + TTL_MS });
}

export function invalidateUserAuthCache(userId) {
  if (userId == null || userId === "") return;
  const id = Number(userId);
  if (Number.isFinite(id)) cache.delete(id);
}
