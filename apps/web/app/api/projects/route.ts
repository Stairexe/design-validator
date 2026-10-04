import { createProjectSchema } from '@/lib/api-schemas';
import { LIMITS, auditLog, rateLimit } from '@/lib/server/limits';
import { handle, json, parseBody } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export const GET = handle(async () =>
  json({ projects: await getDeps().repository.listProjects() }),
);

export const POST = handle(async (request: Request) => {
  rateLimit(request, 'writes', LIMITS.writesPerMinute, 60 * 1000);
  auditLog(request, 'project.create');
  const body = await parseBody(request, createProjectSchema);
  return json({ project: await getDeps().repository.createProject(body) }, { status: 201 });
});
