import { UnrecoverableError, type StageProcessor } from '@design-validator/jobs';

/**
 * Deletes expired artifacts and audit data according to retention policy.
 *
 * Placeholder until Phase 12 — Product Hardening (see phases.md). Jobs fail without retry so a
 * prematurely enqueued audit surfaces immediately instead of hanging.
 */
export const processCleanup: StageProcessor = () =>
  Promise.reject(new UnrecoverableError('cleanup is not implemented yet (Phase 12)'));
