import { describe } from 'vitest';

import { PrismaAuditRepository, createDatabaseClient } from '../src';
import { repositoryContract } from './repository-contract';

const databaseUrl = process.env['DATABASE_URL'];

// Requires a migrated PostgreSQL database (CI provides one).
describe.runIf(databaseUrl)('PostgreSQL', () => {
  repositoryContract(
    'PrismaAuditRepository',
    () => new PrismaAuditRepository(createDatabaseClient(databaseUrl ?? '')),
  );
});
