
import IORedis from "ioredis";

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD || undefined,

  // OBBLIGATORIO PER BULLMQ
  maxRetriesPerRequest: null,
});

redisConnection.ping().then(() => {
  console.log("🟢 Redis connesso");
}).catch(err => {
  console.error("🔴 Redis error", err);
});