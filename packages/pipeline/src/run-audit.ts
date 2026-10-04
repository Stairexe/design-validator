import type { AuditRecord, AuditStatus } from '@design-validator/database';
import { PipelineError } from '@design-validator/jobs';

import type { PipelineDependencies } from './deps';
import { toPipelineError } from './failures';
import { runComparison } from './stages/compare';
import { runDesignImport } from './stages/design';
import { runWebsiteInspection } from './stages/inspect';
import { runVisualDiff } from './stages/visual';

class Cancelled extends Error {}

/** Records progress; stops if the audit was cancelled in the meantime. */
async function advance(
  deps: PipelineDependencies,
  auditId: string,
  stage: AuditStatus,
  message: string,
  progress: number,
): Promise<AuditRecord> {
  const current = await deps.repository.getAudit(auditId);
  if (!current) throw new PipelineError('INTERNAL_ERROR', `Audit ${auditId} no longer exists.`);
  if (current.status === 'CANCELLED') throw new Cancelled();
  const updated = await deps.repository.updateAudit(auditId, {
    status: stage,
    progress: { stage, message, progress },
  });
  return updated ?? current;
}

/**
 * Runs every stage of an audit in this process (inline mode). Failures are
 * recorded as typed codes on the audit; this function never throws for
 * stage failures, so it is safe to run in the background of a request.
 */
export async function runAudit(
  deps: PipelineDependencies,
  auditId: string,
): Promise<AuditRecord | null> {
  const logger = deps.logger.child({ auditId });
  const started = Date.now();
  try {
    let audit = await deps.repository.getAudit(auditId);
    if (!audit) throw new PipelineError('INTERNAL_ERROR', `Audit ${auditId} not found.`);
    if (audit.status !== 'QUEUED') {
      logger.warn('audit is not queued; skipping', { status: audit.status });
      return audit;
    }
    const source = await deps.repository.getDesignSource(audit.designSourceId);
    if (!source)
      throw new PipelineError('DESIGN_SOURCE_INVALID', 'The design source no longer exists.');
    await deps.repository.updateAudit(auditId, { startedAt: new Date().toISOString() });

    const viewportCount = audit.viewports.length;
    audit = await advance(
      deps,
      auditId,
      'INSPECTING_WEBSITE',
      'Loading and rendering the website',
      0.05,
    );
    const warnings = await runWebsiteInspection(deps, audit, async (index) => {
      const viewport = audit?.viewports[index];
      await advance(
        deps,
        auditId,
        'INSPECTING_WEBSITE',
        `Extracting styles and geometry at ${viewport?.width ?? ''}×${viewport?.height ?? ''}`,
        0.05 + (0.4 * index) / viewportCount,
      );
    });

    audit = await advance(
      deps,
      auditId,
      'IMPORTING_DESIGN',
      'Loading the design and parsing its hierarchy',
      0.45,
    );
    await runDesignImport(deps, audit, source);

    audit = await advance(
      deps,
      auditId,
      'MATCHING',
      'Matching design elements to the website',
      0.6,
    );
    await advance(deps, auditId, 'COMPARING', 'Comparing properties', 0.7);
    await runComparison(deps, audit);

    if (audit.settings.visualDiff) {
      audit = await advance(deps, auditId, 'VISUAL_DIFF', 'Building visual comparison', 0.85);
      try {
        const visual = await runVisualDiff(deps, audit, source);
        warnings.push(...visual.warnings);
      } catch (error) {
        // Visual evidence is optional; measured differences stand without it.
        warnings.push(`Visual comparison unavailable: ${toPipelineError(error).message}`);
      }
    }

    await deps.repository.updateAudit(auditId, {
      status: 'COMPLETED',
      progress: { stage: 'COMPLETED', message: 'Completed', progress: 1 },
      completedAt: new Date().toISOString(),
      warnings,
    });
    logger.info('audit completed', { durationMs: Date.now() - started });
  } catch (error) {
    if (error instanceof Cancelled) {
      logger.info('audit cancelled');
      return deps.repository.getAudit(auditId);
    }
    const failure = toPipelineError(error);
    logger.error('audit failed', { code: failure.code, error: failure.message });
    const current = await deps.repository.getAudit(auditId);
    await deps.repository.updateAudit(auditId, {
      status: 'FAILED',
      failureCode: failure.code,
      failureMessage: failure.message,
      completedAt: new Date().toISOString(),
      progress: {
        stage: 'FAILED',
        message: failure.message,
        progress: current?.progress?.progress ?? 0,
      },
    });
  }
  return deps.repository.getAudit(auditId);
}
