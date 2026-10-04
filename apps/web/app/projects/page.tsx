import type { AuditRecord } from '@design-validator/database';
import { FolderIcon, GlobeAltIcon } from '@heroicons/react/20/solid';
import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusBadge } from '@/components/audit/status-badge';
import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { CreateProjectForm } from '@/components/projects/create-project-form';
import { ProjectAvatar } from '@/components/projects/project-avatar';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { differenceCount, displayUrl, formatRelative } from '@/lib/labels';
import { getDeps } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'Projects' };
export const dynamic = 'force-dynamic';

function LatestAudit({ audit }: { audit: AuditRecord | undefined }) {
  if (!audit) return <span className="text-zinc-400">No audits yet</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      {audit.status === 'COMPLETED' ? (
        <span className="font-medium text-zinc-700 tabular-nums">
          {audit.issueCount === 0 ? 'Matches design' : differenceCount(audit.issueCount)}
        </span>
      ) : (
        <StatusBadge status={audit.status} />
      )}
      <span className="truncate text-zinc-400">· {formatRelative(audit.createdAt)}</span>
    </span>
  );
}

export default async function ProjectsPage() {
  const { repository } = getDeps();
  const [projects, audits] = await Promise.all([
    repository.listProjects(),
    repository.listAudits({ limit: 500 }),
  ]);
  const latest = new Map<string, AuditRecord>();
  const counts = new Map<string, number>();
  for (const audit of audits) {
    counts.set(audit.projectId, (counts.get(audit.projectId) ?? 0) + 1);
    const seen = latest.get(audit.projectId);
    if (!seen || seen.createdAt < audit.createdAt) latest.set(audit.projectId, audit);
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="A project is one web page and the designs it should match."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {projects.length === 0 ? (
          <Card>
            <EmptyState icon={<FolderIcon />} title="No projects yet">
              Create your first project with the form. All you need is the address of the page you
              want to check.
            </EmptyState>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((project, index) => (
              <li
                key={project.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <Card className="group relative h-full transition-shadow hover:shadow-raised">
                  <div className="flex items-start gap-3 p-5">
                    <ProjectAvatar name={project.name} />
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-semibold text-zinc-950 after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-500"
                      >
                        {project.name}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-zinc-500">
                        <GlobeAltIcon aria-hidden className="size-3.5 shrink-0 text-zinc-400" />
                        <span className="truncate">{displayUrl(project.websiteUrl)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-zinc-950/[0.05] px-5 py-3 text-[13px]">
                    <LatestAudit audit={latest.get(project.id)} />
                    <span className="shrink-0 text-zinc-400 tabular-nums">
                      {counts.get(project.id) ?? 0} audit{counts.get(project.id) === 1 ? '' : 's'}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <Card className="lg:sticky lg:top-10">
          <CardHeader title="New project" description="Start with the page you want to check." />
          <CardBody>
            <CreateProjectForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
