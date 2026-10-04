import { createXdDesignSource } from '@design-validator/pipeline';

import { createXdSourceSchema } from '@/lib/api-schemas';
import { LIMITS, auditLog, rateLimit } from '@/lib/server/limits';
import { handle, json, parseBody } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export const POST = handle(async (request: Request) => {
  rateLimit(request, 'writes', LIMITS.writesPerMinute, 60 * 1000);
  auditLog(request, 'design-source.create');
  const body = await parseBody(request, createXdSourceSchema);
  const source = await createXdDesignSource(getDeps(), body);
  return json({ designSource: source }, { status: 201 });
});
