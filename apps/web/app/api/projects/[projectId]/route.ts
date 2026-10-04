import { deleteProject } from '@design-validator/pipeline';

import { updateProjectSchema } from '@/lib/api-schemas';
import { handle, json, notFound, parseBody } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ projectId: string }> };

export const GET = handle(async (_request: Request, { params }: Context) => {
  const { projectId } = await params;
  const { repository } = getDeps();
  const project = await repository.getProject(projectId);
  if (!project) throw notFound('Project');
  const [designSources, audits] = await Promise.all([
    repository.listDesignSources(projectId),
    repository.listAudits({ projectId }),
  ]);
  return json({ project, designSources, audits });
});

export const PATCH = handle(async (request: Request, { params }: Context) => {
  const { projectId } = await params;
  const body = await parseBody(request, updateProjectSchema);
  const patch = {
    ...(body.name === undefined ? {} : { name: body.name }),
    ...(body.websiteUrl === undefined ? {} : { websiteUrl: body.websiteUrl }),
    ...(body.sourceRepository === undefined ? {} : { sourceRepository: body.sourceRepository }),
  };
  const project = await getDeps().repository.updateProject(projectId, patch);
  if (!project) throw notFound('Project');
  return json({ project });
});

export const DELETE = handle(async (_request: Request, { params }: Context) => {
  const { projectId } = await params;
  if (!(await deleteProject(getDeps(), projectId))) throw notFound('Project');
  return new Response(null, { status: 204 });
});
