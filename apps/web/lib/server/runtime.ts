import 'server-only';

import { createRedisConnection } from '@design-validator/jobs';
import {
  createRuntime,
  enqueueAudit,
  runAudit,
  type PipelineRuntime,
} from '@design-validator/pipeline';
import type { AuditRecord, DesignSourceRecord } from '@design-validator/database';
import type { Redis } from 'ioredis';
import { after } from 'next/server';

// Next.js may evaluate this module separately for route handlers and pages; keep one runtime per process.
const globalState = globalThis as typeof globalThis & {
  __designValidatorRuntime?: PipelineRuntime;
  __designValidatorRedis?: Redis;
};

/** Process-wide pipeline runtime built from validated environment variables. */
export function getRuntime(): PipelineRuntime {
  globalState.__designValidatorRuntime ??= createRuntime(process.env, 'web');
  return globalState.__designValidatorRuntime;
}

export const getDeps = () => getRuntime().deps;

/**
 * Starts an audit. Queue mode hands it to the workers; inline mode (e.g. on
 * Vercel, where no workers run) executes it after the response is sent, within
 * the route's `maxDuration`.
 */
export async function startAudit(
  audit: AuditRecord,
  source: DesignSourceRecord,
  correlationId: string,
): Promise<void> {
  const { execution, redisUrl, deps } = getRuntime();
  if (execution === 'queue' && redisUrl) {
    globalState.__designValidatorRedis ??= createRedisConnection(redisUrl);
    await enqueueAudit(globalState.__designValidatorRedis, audit, source.kind, correlationId);
    return;
  }
  const counter = ((
    globalThis as typeof globalThis & { __designValidatorRunning?: { count: number } }
  ).__designValidatorRunning ??= { count: 0 });
  counter.count++;
  after(async () => {
    try {
      await runAudit(deps, audit.id);
    } finally {
      counter.count--;
    }
  });
}
