import rateLimit from "express-rate-limit";
import { redisConnection } from "../config/redis.js";
import logger, { logError } from "../utils/logger.js";


const isRedisReady = () => redisConnection.status === "ready";

/**
 * Rate Limiter Globale
 * Max 100 richieste ogni 15 minuti per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isRedisReady(),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please slow down and try again in a few minutes.",
      retryAfter: 900,
    });
  },
});

/**
 * Rate Limiter per Login/Register
 * Max 5 tentativi falliti ogni 15 minuti per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  skip: () => !isRedisReady(),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again in 15 minutes.",
      retryAfter: 900,
    });
  },
});

/**
 * Upload Limiter - Max 50 upload al giorno per utente
 */
export const uploadRateLimiter = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!isRedisReady()) {
      return next();
    }

    const today = new Date().toISOString().split("T")[0];
    const key = `upload:daily:${userId}:${today}`;

    const currentCount = await redisConnection.get(key);
    const uploadCount = parseInt(currentCount || "0");

    const DAILY_LIMIT = 50;

    if (uploadCount >= DAILY_LIMIT) {
      logger.warn("Daily upload limit exceeded", { userId, uploadCount, limit: DAILY_LIMIT });
      return res.status(429).json({
        success: false,
        error: "DAILY_UPLOAD_LIMIT_EXCEEDED",
        message: `Daily upload limit reached. You can upload up to ${DAILY_LIMIT} documents per day. Limit resets at midnight.`,
        limit: DAILY_LIMIT,
        current: uploadCount,
        resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
      });
    }

    const newCount = await redisConnection.incr(key);

    if (newCount === 1) {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const secondsUntilMidnight = Math.floor((midnight - now) / 1000);
      await redisConnection.expire(key, secondsUntilMidnight);
    }

    res.set("X-Upload-Limit", DAILY_LIMIT.toString());
    res.set("X-Upload-Remaining", (DAILY_LIMIT - newCount).toString());

    next();
  } catch (error) {
    logError(error, { operation: "uploadRateLimiter", userId: req.user?.id });
    next();
  }
};

/**
 * Stats Rate Limiter
 * Max 30 richieste al minuto per utente
 */
export const statsRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  skip: () => !isRedisReady(),
  keyGenerator: (req) => req.user?.id ? `user:${req.user.id}` : undefined,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "STATS_RATE_LIMIT_EXCEEDED",
      message: "Too many stats requests. Please wait a moment.",
      retryAfter: 60,
    });
  },
});
