import { createProjectSchema } from '@/lib/api-schemas';
import { handle, json, parseBody } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export const GET = handle(async () =>
  json({ projects: await getDeps().repository.listProjects() }),
);

export const POST = handle(async (request: Request) => {
  const body = await parseBody(request, createProjectSchema);
  return json({ project: await getDeps().repository.createProject(body) }, { status: 201 });
});
