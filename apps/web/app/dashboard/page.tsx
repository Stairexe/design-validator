import type { AuditRecord } from '@design-validator/database';
import {
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  PlusIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/20/solid';
import type { Metadata } from 'next';

import { AuditTable } from '@/components/audit/audit-table';
import { RunSampleButton } from '@/components/audit/run-sample-button';
import { GettingStarted, SampleIssuePreview } from '@/components/dashboard/getting-started';
import { PageHeader } from '@/components/layout/page-header';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { isRunning } from '@/lib/labels';
import { getDeps } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

/** Differences still open: the latest completed audit of each project. */
function openDifferences(audits: AuditRecord[]): number {
  const latest = new Map<string, AuditRecord>();
  for (const audit of audits) {
    if (audit.status !== 'COMPLETED') continue;
    const seen = latest.get(audit.projectId);
    if (!seen || seen.createdAt < audit.createdAt) latest.set(audit.projectId, audit);
  }
  return [...latest.values()].reduce((sum, audit) => sum + audit.issueCount, 0);
}

export default async function DashboardPage() {
  const { repository } = getDeps();
  const [projects, audits] = await Promise.all([
    repository.listProjects(),
    repository.listAudits({ limit: 200 }),
  ]);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const completed = audits.filter((audit) => audit.status === 'COMPLETED').length;
  const running = audits.filter((audit) => isRunning(audit.status)).length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="See exactly what to change so a website matches its design."
        actions={
          audits.length > 0 ? (
            <>
              <ButtonLink href="/projects" variant="secondary">
                <FolderIcon aria-hidden className="text-zinc-400" />
                Projects
              </ButtonLink>
              <ButtonLink href="/audits/new">
                <PlusIcon aria-hidden />
                New audit
              </ButtonLink>
            </>
          ) : null
        }
      />

      {audits.length === 0 ? (
        <GettingStarted hasProjects={projects.length > 0} />
      ) : (
        <div className="space-y-6">
          <div className="grid animate-fade-up gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Projects" value={projects.length} icon={<FolderIcon />} />
            <Stat
              label="Audits completed"
              value={completed}
              icon={<ClipboardDocumentCheckIcon />}
              tone="success"
            />
            <Stat
              label="Open differences"
              value={openDifferences(audits)}
              hint="In the latest audit of each project"
              icon={<WrenchScrewdriverIcon />}
              tone="warning"
            />
            <Stat
              label="Running now"
              value={running}
              icon={<ArrowPathIcon />}
              tone={running > 0 ? 'brand' : 'neutral'}
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Recent audits"
                description="Latest runs across all projects."
                actions={
                  <ButtonLink href="/audits" variant="ghost" size="sm">
                    View all
                  </ButtonLink>
                }
              />
              <AuditTable audits={audits.slice(0, 8)} projects={projectById} />
            </Card>
            <Card className="h-fit overflow-hidden">
              <CardHeader title="Try it" description="No account or design file needed." />
              <CardBody className="space-y-4">
                <p className="text-sm leading-relaxed text-zinc-600">
                  Run the bundled sample: a pricing page checked against its Figma design at desktop
                  and mobile widths.
                </p>
                <SampleIssuePreview compact />
                <RunSampleButton variant="secondary" />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
