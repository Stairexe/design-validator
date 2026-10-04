import { UnrecoverableError, type StageProcessor } from '@design-validator/jobs';

/**
 * Matches elements and produces deterministic ValidationIssues per viewport.
 *
 * Placeholder until Phase 4/5 — Matcher and Comparison Engine (see phases.md). Jobs fail without retry so a
 * prematurely enqueued audit surfaces immediately instead of hanging.
 */
export const processComparison: StageProcessor = () =>
  Promise.reject(new UnrecoverableError('comparison is not implemented yet (Phase 4/5)'));
