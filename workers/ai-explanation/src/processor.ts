import { UnrecoverableError, type StageProcessor } from '@design-validator/jobs';

/**
 * Requests optional Claude explanations for already-measured issue groups.
 *
 * Placeholder until Phase 8 — Claude Recommendation Layer (see phases.md). Jobs fail without retry so a
 * prematurely enqueued audit surfaces immediately instead of hanging.
 */
export const processAiExplanation: StageProcessor = () =>
  Promise.reject(new UnrecoverableError('ai-explanation is not implemented yet (Phase 8)'));
