import { deleteAuditArtifacts } from '@design-validator/pipeline';

import { handle, notFound } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export const DELETE = handle(
  async (_request: Request, { params }: { params: Promise<{ sourceId: string }> }) => {
    const { sourceId } = await params;
    const { repository, storage } = getDeps();
    const source = await repository.getDesignSource(sourceId);
    if (!source) throw notFound('Design source');
    for (const audit of await repository.listAudits({ projectId: source.projectId })) {
      if (audit.designSourceId === sourceId) await deleteAuditArtifacts(storage, audit.id);
    }
    if (source.uploadObjectKey) await storage.delete(source.uploadObjectKey);
    await repository.deleteDesignSource(sourceId);
    return new Response(null, { status: 204 });
  },
);
