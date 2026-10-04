import type { AuditRecord } from '@design-validator/database';
import { FlowProducer } from 'bullmq';
import type { Redis } from 'ioredis';
import {
  PipelineError,
  QUEUE_NAMES,
  idempotencyKey,
  type JobEnvelope,
  type StageProcessor,
} from '@design-validator/jobs';

import type { PipelineDependencies } from './deps';
import { toPipelineError } from './failures';
import { runComparison } from './stages/compare';
import { runDesignImport } from './stages/design';
import { runWebsiteInspection } from './stages/inspect';
import { runVisualDiff } from './stages/visual';

const RETRY = { attempts: 2, backoff: { type: 'exponential', delay: 5_000 } } as const;

/**
 * Queue mode: website inspection and design import run in parallel on their
 * workers; the comparison job (their parent) runs once both succeeded and
 * finishes the audit. Job IDs are idempotency keys, so re-enqueueing is a no-op.
 */
export async function enqueueAudit(
  connection: Redis,
  audit: AuditRecord,
  sourceKind: 'figma' | 'adobe-xd',
  correlationId: string,
): Promise<void> {
  const envelope: JobEnvelope = {
    auditId: audit.id,
    projectId: audit.projectId,
    attempt: 1,
    correlationId,
    inputHash: audit.inputHash,
  };
  const jobId = (stage: Parameters<typeof idempotencyKey>[0]['stage']) =>
    idempotencyKey({ auditId: audit.id, stage, inputHash: audit.inputHash });
  const flow = new FlowProducer({ connection });
  try {
    await flow.add({
      name: 'comparison',
      queueName: QUEUE_NAMES.comparison,
      data: envelope,
      opts: { jobId: jobId('COMPARING'), ...RETRY },
      children: [
        {
          name: 'website-inspection',
          queueName: QUEUE_NAMES.websiteInspection,
          data: envelope,
          opts: { jobId: jobId('INSPECTING_WEBSITE'), failParentOnFailure: true, ...RETRY },
        },
        {
          name: 'design-import',
          queueName: sourceKind === 'figma' ? QUEUE_NAMES.figmaImport : QUEUE_NAMES.xdImport,
          data: envelope,
          opts: { jobId: jobId('IMPORTING_DESIGN'), failParentOnFailure: true, ...RETRY },
        },
      ],
    });
  } finally {
    await flow.close();
  }
}

async function loadAudit(deps: PipelineDependencies, envelope: JobEnvelope) {
  const audit = await deps.repository.getAudit(envelope.auditId);
  if (!audit) throw new PipelineError('INTERNAL_ERROR', `Audit ${envelope.auditId} not found.`);
  if (audit.status === 'CANCELLED')
    throw new PipelineError('INTERNAL_ERROR', 'Audit was cancelled.');
  return audit;
}

/** Records a terminal failure on the audit, then rethrows for BullMQ's retry logic. */
async function failAudit(
  deps: PipelineDependencies,
  auditId: string,
  error: unknown,
  finalAttempt: boolean,
): Promise<never> {
  const failure = toPipelineError(error);
  if (finalAttempt || !failure.retryable) {
    await deps.repository.updateAudit(auditId, {
      status: 'FAILED',
      failureCode: failure.code,
      failureMessage: failure.message,
      completedAt: new Date().toISOString(),
      progress: { stage: 'FAILED', message: failure.message, progress: 0 },
    });
  }
  throw failure;
}

const isFinalAttempt = (attemptsMade: number) => attemptsMade + 1 >= RETRY.attempts;

/** Stage processors for the `workers/*` packages. */
export function stageProcessors(
  deps: PipelineDependencies,
): Record<'websiteInspection' | 'designImport' | 'comparison', StageProcessor> {
  return {
    websiteInspection: async ({ envelope, job }) => {
      const audit = await loadAudit(deps, envelope);
      try {
        await deps.repository.updateAudit(audit.id, {
          status: 'INSPECTING_WEBSITE',
          startedAt: audit.startedAt ?? new Date().toISOString(),
          progress: {
            stage: 'INSPECTING_WEBSITE',
            message: 'Inspecting the website',
            progress: 0.1,
          },
        });
        const warnings = await runWebsiteInspection(deps, audit);
        return { warnings };
      } catch (error) {
        return failAudit(deps, audit.id, error, isFinalAttempt(job.attemptsMade));
      }
    },
    designImport: async ({ envelope, job }) => {
      const audit = await loadAudit(deps, envelope);
      try {
        const source = await deps.repository.getDesignSource(audit.designSourceId);
        if (!source)
          throw new PipelineError('DESIGN_SOURCE_INVALID', 'The design source no longer exists.');
        await runDesignImport(deps, audit, source);
        return { imported: true };
      } catch (error) {
        return failAudit(deps, audit.id, error, isFinalAttempt(job.attemptsMade));
      }
    },
    comparison: async ({ envelope, job }) => {
      const audit = await loadAudit(deps, envelope);
      try {
        const children = Object.values(await job.getChildrenValues<{ warnings?: string[] }>());
        const warnings = children.flatMap((value) => value.warnings ?? []);
        await deps.repository.updateAudit(audit.id, {
          status: 'COMPARING',
          progress: { stage: 'COMPARING', message: 'Comparing properties', progress: 0.7 },
        });
        await runComparison(deps, audit);
        if (audit.settings.visualDiff) {
          const source = await deps.repository.getDesignSource(audit.designSourceId);
          await deps.repository.updateAudit(audit.id, {
            status: 'VISUAL_DIFF',
            progress: {
              stage: 'VISUAL_DIFF',
              message: 'Building visual comparison',
              progress: 0.85,
            },
          });
          if (source) {
            try {
              warnings.push(...(await runVisualDiff(deps, audit, source)).warnings);
            } catch (error) {
              warnings.push(`Visual comparison unavailable: ${toPipelineError(error).message}`);
            }
          }
        }
        await deps.repository.updateAudit(audit.id, {
          status: 'COMPLETED',
          warnings,
          completedAt: new Date().toISOString(),
          progress: { stage: 'COMPLETED', message: 'Completed', progress: 1 },
        });
        return { completed: true };
      } catch (error) {
        return failAudit(deps, audit.id, error, isFinalAttempt(job.attemptsMade));
      }
    },
  };
}
