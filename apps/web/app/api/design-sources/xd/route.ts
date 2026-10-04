import { createXdDesignSource } from '@design-validator/pipeline';

import { createXdSourceSchema } from '@/lib/api-schemas';
import { handle, json, parseBody } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export const POST = handle(async (request: Request) => {
  const body = await parseBody(request, createXdSourceSchema);
  const source = await createXdDesignSource(getDeps(), body);
  return json({ designSource: source }, { status: 201 });
});
