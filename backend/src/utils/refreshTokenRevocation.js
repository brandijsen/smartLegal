import crypto from "crypto";
import { redisConnection } from "../config/redis.js";
import logger from "./logger.js";

const PREFIX = "auth:rt_revoked:";

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/**
 * Marks a refresh JWT as revoked until it would have expired (logout / stolen token).
 * Best-effort: failures are logged; caller still clears cookies.
 */
async function setRevocationKey(key, ttlSeconds, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      await redisConnection.set(key, "1", "EX", ttlSeconds);
      return true;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 80 * (i + 1)));
      }
    }
  }
  logger.warn("Refresh token revocation failed after retries (Redis)", {
    error: lastErr?.message,
  });
  return false;
}

export async function revokeRefreshToken(rawToken, ttlSeconds) {
  if (!rawToken || ttlSeconds < 1) return;
  await setRevocationKey(`${PREFIX}${hashToken(rawToken)}`, ttlSeconds);
}

/**
 * @returns {Promise<boolean>} true if token was revoked via logout
 */
export async function isRefreshTokenRevoked(rawToken) {
  if (!rawToken) return true;
  try {
    const v = await redisConnection.get(`${PREFIX}${hashToken(rawToken)}`);
    return v === "1";
  } catch (err) {
    logger.warn("Refresh revocation check failed (Redis); allowing refresh", {
      error: err.message,
    });
    return false;
  }
}

/** Best-effort GET with short retry (reduces flaky denials when Redis blips). */
export async function isRefreshTokenRevokedWithRetry(rawToken, attempts = 2) {
  if (!rawToken) return true;
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const v = await redisConnection.get(`${PREFIX}${hashToken(rawToken)}`);
      return v === "1";
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 50 * (i + 1)));
      }
    }
  }
  logger.warn("Refresh revocation check failed after retries; allowing refresh", {
    error: lastErr?.message,
  });
  return false;
}
