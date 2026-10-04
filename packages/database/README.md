# @design-validator/database

PostgreSQL schema, migrations and Prisma client factory.

- Schema: `prisma/schema.prisma`; migrations: `prisma/migrations/`.
- The generated client (`src/generated/`) is git-ignored and produced by `prisma generate` on install.
- `DATABASE_URL` is read from the repository-root `.env` (see `prisma.config.ts`).

```bash
pnpm db:migrate          # create/apply a migration in development
pnpm db:migrate:deploy   # apply committed migrations (CI / production)
pnpm db:check            # after deploy: the migrated database matches the schema (no missing migration)
```

Large artifacts (screenshots, DesignSpec snapshots, report JSON) belong in object storage
(`@design-validator/storage`); rows store their object keys.
