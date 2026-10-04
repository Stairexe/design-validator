import { listFigmaFrames } from '@design-validator/pipeline';

import { HttpError, handle, json } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

/** Lists a Figma file's pages and frames for target selection. */
export const GET = handle(async (request: Request) => {
  const url = new URL(request.url).searchParams.get('url');
  if (!url) throw new HttpError(422, 'VALIDATION_FAILED', 'Query parameter "url" is required.');
  return json(await listFigmaFrames(getDeps(), url));
});
