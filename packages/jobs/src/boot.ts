import { parseEnv, redisEnvSchema, runtimeEnvSchema } from '@design-validator/config';

import { createRedisConnection } from './connection';
import { createLogger } from './logger';
import type { QueueName } from './queues';
import { closeOnSignals, startWorker, type StageProcessor, type WorkerHandle } from './worker';

const workerEnvSchema = runtimeEnvSchema.extend(redisEnvSchema.shape);

/**
 * Process entry point shared by every `workers/*` package: validates the
 * environment, connects to Redis, starts the queue consumer and installs
 * graceful shutdown.
 */
export function bootStageWorker(queueName: QueueName, processor: StageProcessor): WorkerHandle {
  const env = parseEnv(workerEnvSchema);
  const logger = createLogger({ service: `worker-${queueName}` }, { level: env.LOG_LEVEL });
  const connection = createRedisConnection(env.REDIS_URL);
  const handle = startWorker({ queueName, processor, connection, logger });
  closeOnSignals(handle, connection, logger);
  return handle;
}
