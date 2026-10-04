import { createSampleDesignSource } from '@design-validator/pipeline';
import { z } from 'zod';

import { handle, json, parseBody } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export const POST = handle(async (request: Request) => {
  const { projectId } = await parseBody(request, z.object({ projectId: z.string().min(1) }));
  return json(
    { designSource: await createSampleDesignSource(getDeps(), projectId) },
    { status: 201 },
  );
});
