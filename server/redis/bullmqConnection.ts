import type { ConnectionOptions } from "bullmq";
import { env } from "../config/env";

/** BullMQ connection options (avoids ioredis version mismatch with direct client instances). */
export function getBullMqConnection(): ConnectionOptions {
  return {
    url: env.redisUrl,
    maxRetriesPerRequest: null,
  };
}
