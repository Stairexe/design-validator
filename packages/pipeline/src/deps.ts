import type { AuditRepository } from '@design-validator/database';
import type { Logger } from '@design-validator/jobs';
import type { ObjectStorage } from '@design-validator/storage';
import type { BrowserProvider } from '@design-validator/web-inspector';

/** Everything the pipeline needs, injected so tests and runtimes can differ. */
export interface PipelineDependencies {
  repository: AuditRepository;
  storage: ObjectStorage;
  browserProvider: BrowserProvider;
  logger: Logger;
  /** Allow loopback/private website targets. Local development and tests only. */
  allowPrivateHosts: boolean;
  /** Server-side Figma token (personal access token). Optional. */
  figmaAccessToken?: string | undefined;
  fetch?: typeof fetch;
}
