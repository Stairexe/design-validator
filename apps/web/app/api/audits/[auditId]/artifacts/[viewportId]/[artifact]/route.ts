import { IMAGE_ARTIFACTS, artifactKeys, type ImageArtifact } from '@design-validator/pipeline';

import { handle, notFound } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

const KEY_FOR: Record<ImageArtifact, (auditId: string, viewportId: string) => string> = {
  'website.png': artifactKeys.websiteScreenshot,
  'design.png': artifactKeys.designImage,
  'diff.png': artifactKeys.diffImage,
};

/** Streams private screenshot artifacts; storage is never exposed publicly. */
export const GET = handle(
  async (
    _request: Request,
    { params }: { params: Promise<{ auditId: string; viewportId: string; artifact: string }> },
  ) => {
    const { auditId, viewportId, artifact } = await params;
    if (
      !(IMAGE_ARTIFACTS as readonly string[]).includes(artifact) ||
      !/^[a-z0-9-]+$/.test(viewportId)
    )
      throw notFound('Artifact');
    const stored = await getDeps().storage.get(
      KEY_FOR[artifact as ImageArtifact](auditId, viewportId),
    );
    if (!stored) throw notFound('Artifact');
    return new Response(Buffer.from(stored.body), {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'private, max-age=300',
        'x-content-type-options': 'nosniff',
      },
    });
  },
);
