import type { ObjectStorage } from '@design-validator/storage';

import { createDatabaseClient } from './client';
import { DocumentAuditRepository } from './document-repository';
import { PrismaAuditRepository } from './prisma-repository';
import type { AuditRepository } from './records';

/**
 * PostgreSQL when `DATABASE_URL` is configured (the documented primary
 * store); otherwise JSON documents in the configured object storage.
 */
export function createAuditRepository(options: {
  databaseUrl?: string | undefined;
  storage: ObjectStorage;
}): AuditRepository {
  return options.databaseUrl
    ? new PrismaAuditRepository(createDatabaseClient(options.databaseUrl))
    : new DocumentAuditRepository(options.storage);
}
