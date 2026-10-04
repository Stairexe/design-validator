import { UnrecoverableError, Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';

import { jobEnvelopeSchema, type JobEnvelope } from './envelope';
import type { Logger } from './logger';
import type { QueueName } from './queues';

export interface StageJobContext {
  envelope: JobEnvelope;
  job: Job;
  logger: Logger;
}

export type StageProcessor = (context: StageJobContext) => Promise<unknown>;

export interface StartWorkerOptions {
  queueName: QueueName;
  processor: StageProcessor;
  connection: Redis;
  logger: Logger;
  concurrency?: number;
  /** Redis key prefix; isolates environments and test runs sharing one Redis. */
  prefix?: string;
}

export interface WorkerHandle {
  worker: Worker;
  close(): Promise<void>;
}

/**
 * Starts a BullMQ worker that validates the job envelope before invoking the
 * stage processor. Queue transport stays in `jobs` and `workers/`; domain
 * packages never depend on BullMQ.
 */
export function startWorker(options: StartWorkerOptions): WorkerHandle {
  const { queueName, processor, connection, logger } = options;
  const queueLogger = logger.child({ queue: queueName });

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const parsed = jobEnvelopeSchema.safeParse(job.data);
      if (!parsed.success) {
        // Retrying a malformed payload can never succeed.
        throw new UnrecoverableError(`Invalid job envelope: ${parsed.error.message}`);
      }
      const jobLogger = queueLogger.child({
        jobId: job.id,
        auditId: parsed.data.auditId,
        correlationId: parsed.data.correlationId,
      });
      return processor({ envelope: parsed.data, job, logger: jobLogger });
    },
    {
      connection,
      concurrency: options.concurrency ?? 1,
      ...(options.prefix ? { prefix: options.prefix } : {}),
    },
  );

  worker.on('ready', () => {
    queueLogger.info('worker ready');
  });
  worker.on('failed', (job, error) => {
    queueLogger.error('job failed', { jobId: job?.id, error: error.message });
  });
  worker.on('error', (error) => {
    queueLogger.error('worker error', { error: error.message });
  });

  return {
    worker,
    close: async () => {
      await worker.close();
      queueLogger.info('worker closed');
    },
  };
}

/** Closes the worker and Redis connection on SIGINT/SIGTERM. */
export function closeOnSignals(handle: WorkerHandle, connection: Redis, logger: Logger): void {
  const shutdown = (signal: NodeJS.Signals) => {
    logger.info('shutting down', { signal });
    handle
      .close()
      .then(() => connection.quit())
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error('shutdown failed', { error: String(error) });
        process.exit(1);
      });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
