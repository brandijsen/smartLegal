
import IORedis from "ioredis";
import logger from "../utils/logger.js";

const redisOptions = { maxRetriesPerRequest: null, family: 0 };

export const redisConnection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, redisOptions)
  : new IORedis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      family: 0,
      ...redisOptions,
    });

redisConnection.ping().then(() => {
  logger.info("Redis connected successfully");
}).catch(err => {
  logger.error("Redis connection failed", { 
    error: err.message,
    stack: err.stack,
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  });
});