import { UnrecoverableError, type StageProcessor } from '@design-validator/jobs';

/**
 * Runs the Playwright website inspector per viewport and stores the Website DesignSpec and screenshot.
 *
 * Placeholder until Phase 2 — Website Inspector (see phases.md). Jobs fail without retry so a
 * prematurely enqueued audit surfaces immediately instead of hanging.
 */
export const processWebsiteInspection: StageProcessor = () =>
  Promise.reject(new UnrecoverableError('website-inspection is not implemented yet (Phase 2)'));
