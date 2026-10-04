import { createHash } from 'node:crypto';

import type {
  AuditSettings,
  AuditViewportConfig,
  DesignSourceRecord,
} from '@design-validator/database';

/** Stable hash of everything that determines an audit's result. */
export function auditInputHash(input: {
  websiteUrl: string;
  viewports: AuditViewportConfig[];
  settings: AuditSettings;
  source: DesignSourceRecord;
}): string {
  const canonical = JSON.stringify({
    websiteUrl: input.websiteUrl,
    viewports: input.viewports,
    settings: input.settings,
    source: {
      id: input.source.id,
      fileKey: input.source.fileKey,
      revision: input.source.revision,
      upload: input.source.uploadObjectKey,
    },
  });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}
