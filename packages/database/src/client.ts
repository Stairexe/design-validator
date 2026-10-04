import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client';

export type DatabaseClient = InstanceType<typeof PrismaClient>;

/**
 * Creates a Prisma client over the node-postgres driver adapter. Callers own
 * the lifecycle: create one per process and `$disconnect()` on shutdown.
 */
export function createDatabaseClient(databaseUrl: string): DatabaseClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}
