import { Redis } from 'ioredis';

/**
 * Creates a Redis connection suitable for BullMQ. BullMQ workers require
 * `maxRetriesPerRequest: null` so blocking commands are not aborted.
 */
export function createRedisConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}
