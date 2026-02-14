
import IORedis from "ioredis";
import logger from "../utils/logger.js";

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD || undefined,

  // OBBLIGATORIO PER BULLMQ
  maxRetriesPerRequest: null,
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