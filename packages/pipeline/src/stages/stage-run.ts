import type { AuditRecord, AuditStatus } from '@design-validator/database';
import { idempotencyKey, type AuditStage } from '@design-validator/jobs';

import type { PipelineDependencies } from '../deps';
import { toPipelineError } from '../failures';

/**
 * Records one unit of stage work under its idempotency key: retries update
 * the same run instead of creating new rows.
 */
export async function withStageRun<T>(
  deps: PipelineDependencies,
  audit: AuditRecord,
  stage: AuditStage & AuditStatus,
  viewportId: string | null,
  work: () => Promise<{
    result: T;
    metrics?: Record<string, unknown>;
    artifactKeys?: Record<string, string>;
  }>,
): Promise<T> {
  const key = idempotencyKey({
    auditId: audit.id,
    stage,
    inputHash: audit.inputHash,
    ...(viewportId ? { viewportId } : {}),
  });
  const existing = (await deps.repository.listStageRuns(audit.id)).find(
    (run) => run.idempotencyKey === key,
  );
  await deps.repository.upsertStageRun({
    idempotencyKey: key,
    auditId: audit.id,
    stage,
    viewportId,
    status: 'RUNNING',
    attempt: (existing?.attempt ?? 0) + 1,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    failureCode: null,
    failureMessage: null,
  });
  try {
    const { result, metrics, artifactKeys } = await work();
    await deps.repository.upsertStageRun({
      idempotencyKey: key,
      auditId: audit.id,
      stage,
      status: 'SUCCEEDED',
      finishedAt: new Date().toISOString(),
      ...(metrics ? { metrics } : {}),
      ...(artifactKeys ? { artifactKeys } : {}),
    });
    return result;
  } catch (error) {
    const failure = toPipelineError(error);
    await deps.repository.upsertStageRun({
      idempotencyKey: key,
      auditId: audit.id,
      stage,
      status: 'FAILED',
      finishedAt: new Date().toISOString(),
      failureCode: failure.code,
      failureMessage: failure.message,
    });
    throw failure;
  }
}
