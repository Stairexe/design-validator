import { existsSync } from 'node:fs';
import path from 'node:path';

import { defineConfig } from 'prisma/config';

// Single env strategy: the Prisma CLI reads the git-ignored repository-root `.env`.
const rootEnvFile = path.resolve(import.meta.dirname, '../../.env');
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Optional so `prisma generate` and `prisma validate` work without a database.
    url: process.env['DATABASE_URL'] ?? '',
  },
});
