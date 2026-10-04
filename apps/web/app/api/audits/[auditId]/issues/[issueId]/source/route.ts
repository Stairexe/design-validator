import { locateIssueSource } from '@design-validator/pipeline';

import { handle, json } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Stylesheet locations and a proposed patch for the issue (Phase 10). */
export const GET = handle(
  async (
    _request: Request,
    { params }: { params: Promise<{ auditId: string; issueId: string }> },
  ) => {
    const { auditId, issueId } = await params;
    return json(await locateIssueSource(getDeps(), auditId, issueId));
  },
);
