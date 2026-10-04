import { UnrecoverableError, type StageProcessor } from '@design-validator/jobs';

/**
 * Produces side-by-side, overlay and difference images for measured issues.
 *
 * Placeholder until Phase 7 — Visual Comparison (see phases.md). Jobs fail without retry so a
 * prematurely enqueued audit surfaces immediately instead of hanging.
 */
export const processVisualDiff: StageProcessor = () =>
  Promise.reject(new UnrecoverableError('visual-diff is not implemented yet (Phase 7)'));
