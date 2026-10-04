import { ClipboardDocumentCheckIcon, PlusIcon } from '@heroicons/react/20/solid';
import type { Metadata } from 'next';

import { AuditTable } from '@/components/audit/audit-table';
import { RunSampleButton } from '@/components/audit/run-sample-button';
import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getDeps } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'Audits' };
export const dynamic = 'force-dynamic';

export default async function AuditsPage() {
  const { repository } = getDeps();
  const [audits, projects] = await Promise.all([
    repository.listAudits({ limit: 100 }),
    repository.listProjects(),
  ]);
  return (
    <>
      <PageHeader
        title="Audits"
        description="Every check of a page against its design, newest first."
        actions={
          <ButtonLink href="/audits/new">
            <PlusIcon aria-hidden />
            New audit
          </ButtonLink>
        }
      />
      <Card className="animate-fade-up">
        {audits.length > 0 ? (
          <AuditTable
            audits={audits}
            projects={new Map(projects.map((project) => [project.id, project]))}
          />
        ) : (
          <EmptyState
            icon={<ClipboardDocumentCheckIcon />}
            title="No audits yet"
            action={<RunSampleButton variant="secondary" />}
          >
            Audits list each difference between the page and its design, grouped by element. Try the
            sample to see one.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
