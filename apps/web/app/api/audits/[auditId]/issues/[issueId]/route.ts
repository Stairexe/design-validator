import { handle, json, notFound } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export const GET = handle(
  async (
    _request: Request,
    { params }: { params: Promise<{ auditId: string; issueId: string }> },
  ) => {
    const { auditId, issueId } = await params;
    const issue = await getDeps().repository.getIssue(auditId, issueId);
    if (!issue) throw notFound('Issue');
    return json({ issue });
  },
);
