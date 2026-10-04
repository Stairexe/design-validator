import { purgeExpiredAudits } from '@design-validator/pipeline';

import { HttpError, handle, json } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Retention job for deployments without the cleanup worker (Vercel Cron).
 * Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export const GET = handle(async (request: Request) => {
  const secret = process.env['CRON_SECRET'];
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Invalid cron credentials.');
  }
  const days = Number(process.env['AUDIT_RETENTION_DAYS'] ?? 30);
  return json(await purgeExpiredAudits(getDeps(), Number.isFinite(days) && days > 0 ? days : 30));
});
