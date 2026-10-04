import { describe, expect, it } from 'vitest';

import { createDatabaseClient } from '../src';

const databaseUrl = process.env['DATABASE_URL'];

// Requires a migrated database (CI provides one; locally run
// `docker compose up postgres` and `pnpm db:migrate:deploy`).
describe.runIf(databaseUrl)('createDatabaseClient (PostgreSQL integration)', () => {
  it('connects and sees the migrated schema', async () => {
    const db = createDatabaseClient(databaseUrl ?? '');
    try {
      const [row] = await db.$queryRaw<{ ok: number }[]>`SELECT 1::int AS ok`;
      expect(row?.ok).toBe(1);
      expect(await db.audit.count()).toBeGreaterThanOrEqual(0);
    } finally {
      await db.$disconnect();
    }
  });
});
