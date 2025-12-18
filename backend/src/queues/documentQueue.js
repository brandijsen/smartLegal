import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const documentQueue = new Queue("document-processing", {
  connection: redisConnection,
});
