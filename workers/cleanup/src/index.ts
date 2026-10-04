import { randomUUID } from 'node:crypto';

import { QUEUE_NAMES, bootStageWorker, createRedisConnection } from '@design-validator/jobs';
import { createRuntime, purgeExpiredAudits } from '@design-validator/pipeline';
import { Queue } from 'bullmq';

const { deps, redisUrl } = createRuntime(process.env, 'worker-cleanup');
const retentionDays = Number(process.env['AUDIT_RETENTION_DAYS'] ?? 30);

bootStageWorker(QUEUE_NAMES.cleanup, () => purgeExpiredAudits(deps, retentionDays));

// Daily retention run (03:17 UTC). Upserting keeps exactly one schedule.
const queue = new Queue(QUEUE_NAMES.cleanup, { connection: createRedisConnection(redisUrl ?? '') });
void queue.upsertJobScheduler(
  'daily-retention',
  { pattern: '17 3 * * *', tz: 'UTC' },
  {
    name: 'retention',
    data: {
      auditId: 'system',
      projectId: 'system',
      attempt: 1,
      correlationId: randomUUID(),
      inputHash: 'retention',
    },
  },
);
