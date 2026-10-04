import { Queue } from 'bullmq';
import { afterAll, describe, expect, it } from 'vitest';

import {
  QUEUE_NAMES,
  createLogger,
  createRedisConnection,
  startWorker,
  type JobEnvelope,
} from '../src';

const redisUrl = process.env['REDIS_URL'];

// Requires a reachable Redis (CI provides one; locally run `docker compose up redis`).
describe.runIf(redisUrl)('startWorker (Redis integration)', () => {
  const connection = createRedisConnection(redisUrl ?? '');
  const queueName = QUEUE_NAMES.cleanup;
  const prefix = `test-${process.pid}`;
  const queue = new Queue(queueName, { connection, prefix });

  afterAll(async () => {
    await queue.obliterate({ force: true });
    await queue.close();
    await connection.quit();
  });

  it('boots, validates the envelope and runs the processor', async () => {
    const envelope: JobEnvelope = {
      auditId: 'audit_1',
      projectId: 'project_1',
      attempt: 1,
      correlationId: 'corr_1',
      inputHash: 'abc',
    };
    const received: JobEnvelope[] = [];

    const handle = startWorker({
      queueName,
      connection,
      prefix,
      logger: createLogger({}, { sink: () => undefined }),
      processor: ({ envelope: payload }) => {
        received.push(payload);
        return Promise.resolve({ ok: true });
      },
    });
    await handle.worker.waitUntilReady();
    const completed = new Promise<void>((resolve) =>
      handle.worker.once('completed', () => {
        resolve();
      }),
    );
    await queue.add('noop', envelope);
    await completed;
    await handle.close();

    expect(received).toEqual([envelope]);
  });
});
