import type { Metadata } from 'next';

import { AuditTable } from '@/components/audit/audit-table';
import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody } from '@/components/ui/card';
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
        description="Each audit lists measured differences per viewport."
      />
      <Card>
        {audits.length > 0 ? (
          <AuditTable
            audits={audits}
            projects={new Map(projects.map((project) => [project.id, project]))}
          />
        ) : (
          <CardBody>
            <EmptyState title="No audits yet">
              Completed audits will appear here with their differences grouped by element.
            </EmptyState>
          </CardBody>
        )}
      </Card>
    </>
  );
}
