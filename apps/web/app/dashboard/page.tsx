import type { Metadata } from 'next';

import { AuditTable } from '@/components/audit/audit-table';
import { RunSampleButton } from '@/components/audit/run-sample-button';
import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { getDeps } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { repository } = getDeps();
  const [projects, audits] = await Promise.all([
    repository.listProjects(),
    repository.listAudits({ limit: 10 }),
  ]);
  const projectById = new Map(projects.map((project) => [project.id, project]));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="See exactly what to change so a website matches its design."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent audits"
            actions={
              <ButtonLink href="/projects" variant="secondary" size="sm">
                New audit
              </ButtonLink>
            }
          />
          {audits.length > 0 ? (
            <AuditTable audits={audits} projects={projectById} />
          ) : (
            <CardBody>
              <EmptyState title="No audits yet">
                Audits compare a rendered website against a Figma or Adobe XD design and list each
                difference as a current value, a required value and the change needed.
              </EmptyState>
            </CardBody>
          )}
        </Card>
        <Card>
          <CardHeader title="Try it" description="No credentials needed." />
          <CardBody className="space-y-3 text-sm text-zinc-700">
            <p>
              Run the bundled sample: a pricing page compared against its Figma design at desktop
              and mobile widths. It shows the full report, including{' '}
              <span className="font-mono">Padding X 20px → 24px</span>.
            </p>
            <RunSampleButton />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
