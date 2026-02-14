import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisConnection } from "../config/redis.js";
import logger, { logError } from "../utils/logger.js";

/**
 * Rate Limiter Globale
 * Max 100 richieste ogni 15 minuti per IP
 * Protegge da abusi e DDoS
 */
export const globalRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
    prefix: "rl:global:",
  }),
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // 100 richieste
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  // Usa il default keyGenerator che gestisce correttamente IPv4 e IPv6
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please slow down and try again in a few minutes.",
      retryAfter: 900, // 15 minuti in secondi
    });
  },
});

/**
 * Rate Limiter per Login/Register
 * Max 5 tentativi falliti ogni 15 minuti per IP
 * Protezione contro brute force attacks
 */
export const authRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
    prefix: "rl:auth:",
  }),
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 5, // 5 tentativi
  skipSuccessfulRequests: true, // Login riusciti non contano
  // Usa il default keyGenerator che gestisce correttamente IPv4 e IPv6
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again in 15 minutes.",
      retryAfter: 900, // 15 minuti in secondi
    });
  },
});

/**
 * Upload Limiter - Max 50 upload al giorno per utente
 * Fair usage policy per uso quotidiano normale
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

    // Chiave Redis per conteggio upload giornalieri
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const key = `upload:daily:${userId}:${today}`;

    // Controlla quanti upload oggi
    const currentCount = await redisConnection.get(key);
    const uploadCount = parseInt(currentCount || "0");

    // Limite: 50 upload al giorno
    const DAILY_LIMIT = 50;

    if (uploadCount >= DAILY_LIMIT) {
      logger.warn("Daily upload limit exceeded", { 
        userId,
        uploadCount,
        limit: DAILY_LIMIT
      });

      return res.status(429).json({
        success: false,
        error: "DAILY_UPLOAD_LIMIT_EXCEEDED",
        message: `Daily upload limit reached. You can upload up to ${DAILY_LIMIT} documents per day. Limit resets at midnight.`,
        limit: DAILY_LIMIT,
        current: uploadCount,
        resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
      });
    }

    // Incrementa contatore
    const newCount = await redisConnection.incr(key);

    // Se è il primo upload oggi, imposta expiry a mezzanotte
    if (newCount === 1) {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const secondsUntilMidnight = Math.floor((midnight - now) / 1000);
      await redisConnection.expire(key, secondsUntilMidnight);
    }

    // Aggiungi info al response header
    res.set("X-Upload-Limit", DAILY_LIMIT.toString());
    res.set("X-Upload-Remaining", (DAILY_LIMIT - newCount).toString());
    
    logger.debug("Upload rate limit check", { 
      userId,
      uploadCount: newCount,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - newCount
    });

    next();
  } catch (error) {
    logError(error, { 
      operation: "uploadRateLimiter",
      userId: req.user?.id
    });
    // In caso di errore Redis, lascia passare (fail-open)
    next();
  }
};

/**
 * Stats Rate Limiter
 * Max 30 richieste al minuto per utente
 * Dashboard può fare polling frequente senza problemi
 */
export const statsRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
    prefix: "rl:stats:",
  }),
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 richieste
  // Per stats usiamo userId se disponibile, altrimenti IP (gestito dal default)
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
