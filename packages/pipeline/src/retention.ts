import type { PipelineDependencies } from './deps';
import { deleteAudit } from './audits';

export interface RetentionResult {
  deletedAudits: number;
  cutoff: string;
}

/**
 * Deletes audits (issues, recommendations, screenshots and reports) older than
 * the retention period. Design sources and projects are kept.
 */
export async function purgeExpiredAudits(
  deps: PipelineDependencies,
  retentionDays: number,
  now = new Date(),
): Promise<RetentionResult> {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const expired = await deps.repository.listAuditsCreatedBefore(cutoff);
  let deletedAudits = 0;
  for (const audit of expired) {
    if (await deleteAudit(deps, audit.id)) deletedAudits++;
  }
  // Cached repository stylesheets are disposable.
  for (const key of await deps.storage.list('source-cache/')) await deps.storage.delete(key);
  deps.logger.info('retention purge', { deletedAudits, cutoff: cutoff.toISOString() });
  return { deletedAudits, cutoff: cutoff.toISOString() };
}
