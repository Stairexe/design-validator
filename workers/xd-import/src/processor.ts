import { UnrecoverableError, type StageProcessor } from '@design-validator/jobs';

/**
 * Validates an uploaded Adobe XD plugin manifest and stores the normalized XD DesignSpec.
 *
 * Placeholder until Phase 9 — Adobe XD (see phases.md). Jobs fail without retry so a
 * prematurely enqueued audit surfaces immediately instead of hanging.
 */
export const processXdImport: StageProcessor = () =>
  Promise.reject(new UnrecoverableError('xd-import is not implemented yet (Phase 9)'));
