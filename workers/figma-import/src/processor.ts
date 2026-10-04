import { UnrecoverableError, type StageProcessor } from '@design-validator/jobs';

/**
 * Fetches the Figma file/node and stores the normalized Figma DesignSpec.
 *
 * Placeholder until Phase 3 — Figma Importer (see phases.md). Jobs fail without retry so a
 * prematurely enqueued audit surfaces immediately instead of hanging.
 */
export const processFigmaImport: StageProcessor = () =>
  Promise.reject(new UnrecoverableError('figma-import is not implemented yet (Phase 3)'));
