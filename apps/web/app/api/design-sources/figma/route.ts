import { createFigmaDesignSource } from '@design-validator/pipeline';

import { createFigmaSourceSchema } from '@/lib/api-schemas';
import { LIMITS, auditLog, rateLimit } from '@/lib/server/limits';
import { handle, json, parseBody } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export const POST = handle(async (request: Request) => {
  rateLimit(request, 'writes', LIMITS.writesPerMinute, 60 * 1000);
  auditLog(request, 'design-source.create');
  const body = await parseBody(request, createFigmaSourceSchema);
  const source = await createFigmaDesignSource(getDeps(), body);
  return json({ designSource: source }, { status: 201 });
});
