import { createFigmaDesignSource } from '@design-validator/pipeline';

import { createFigmaSourceSchema } from '@/lib/api-schemas';
import { handle, json, parseBody } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export const POST = handle(async (request: Request) => {
  const body = await parseBody(request, createFigmaSourceSchema);
  const source = await createFigmaDesignSource(getDeps(), body);
  return json({ designSource: source }, { status: 201 });
});
